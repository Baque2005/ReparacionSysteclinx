const pool = require('../db');
const {
  enviarCorreoBienvenida,
  enviarCorreoReset,
  enviarCorreoPresupuesto,
  generarPassword
} = require('../utils/mailer');

exports.asignarTecnico = async (req, res) => {
  const { orden_id, tecnico_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE ordenes SET tecnico_id = $1 WHERE id = $2 RETURNING *',
      [tecnico_id, orden_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al asignar técnico' });
  }
};

exports.obtenerOrdenesPorTecnico = async (req, res) => {
  const { tecnico_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT o.id AS orden_id, o.estado_actual, o.aprobado,
              e.marca, e.modelo, e.descripcion
       FROM ordenes o
       JOIN equipos e ON o.equipo_id = e.id
       WHERE o.tecnico_id = $1`,
      [tecnico_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener órdenes del técnico' });
  }
};

exports.actualizarEstadoOrden = async (req, res) => {
  const { orden_id, nuevo_estado, tecnico_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO estados (orden_id, estado, tecnico_id) VALUES ($1, $2, $3)',
      [orden_id, nuevo_estado, tecnico_id]
    );

    await pool.query(
      'INSERT INTO historial_tecnico (orden_id, tecnico_id, descripcion) VALUES ($1, $2, $3)',
      [orden_id, tecnico_id, `Cambio estado a "${nuevo_estado}"`]
    );

    if (nuevo_estado === 'reparado') {
      const aprobadoRes = await pool.query(
        'SELECT aprobado FROM ordenes WHERE id = $1',
        [orden_id]
      );
      const aprobado = aprobadoRes.rows[0]?.aprobado;

      let total = 0;
      let tipo = '';
      let concepto = '';

      if (aprobado) {
        const materiales = await pool.query(
          'SELECT precio FROM presupuestos WHERE orden_id = $1',
          [orden_id]
        );
        const sumaMateriales = materiales.rows.reduce((acc, m) => acc + Number(m.precio), 0);
        total = sumaMateriales + 10;
        tipo = 'reparacion';
        concepto = 'Reparación y diagnóstico';
      } else {
        total = 10;
        tipo = 'diagnostico';
        concepto = 'Solo diagnóstico';
      }

      const montoConIVA = Number((total * 1.15).toFixed(2));

      await pool.query(
        'INSERT INTO facturas (orden_id, monto, tipo, concepto) VALUES ($1, $2, $3, $4)',
        [orden_id, montoConIVA, tipo, concepto]
      );

      console.log(`🧾 Factura generada para orden ${orden_id}: $${montoConIVA}`);

      await pool.query(
        'UPDATE ordenes SET estado_actual = $1 WHERE id = $2',
        ['lista para entrega', orden_id]
      );

      await pool.query(
        'INSERT INTO estados (orden_id, estado, tecnico_id) VALUES ($1, $2, $3)',
        [orden_id, 'lista para entrega', tecnico_id]
      );

      await pool.query(
        'INSERT INTO historial_tecnico (orden_id, tecnico_id, descripcion) VALUES ($1, $2, $3)',
        [orden_id, tecnico_id, `Equipo reparado. Se generó factura (${tipo}).`]
      );
    } else if (nuevo_estado === 'diagnóstico') {
      await pool.query(
        'UPDATE ordenes SET estado_actual = $1, aprobado = NULL WHERE id = $2',
        [nuevo_estado, orden_id]
      );
    } else {
      await pool.query(
        'UPDATE ordenes SET estado_actual = $1 WHERE id = $2',
        [nuevo_estado, orden_id]
      );
    }

    res.json({ mensaje: 'Estado actualizado y registrado en historial técnico' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar estado de la orden' });
  }
};

exports.obtenerOrdenesPendientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id AS orden_id, o.estado_actual, o.aprobado,
             e.marca, e.modelo, e.descripcion
      FROM ordenes o
      JOIN equipos e ON o.equipo_id = e.id
      WHERE o.tecnico_id IS NULL
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener órdenes pendientes' });
  }
};

// ✅ FUNCION ACTUALIZADA
exports.guardarPresupuesto = async (req, res) => {
  const { orden_id, materiales } = req.body;

  try {
    await pool.query(
      'DELETE FROM presupuestos WHERE orden_id = $1',
      [orden_id]
    );

    for (const item of materiales) {
      await pool.query(
        'INSERT INTO presupuestos (orden_id, material, precio) VALUES ($1, $2, $3)',
        [orden_id, item.nombre, item.precio]
      );
    }

    await pool.query('UPDATE ordenes SET autorizado = TRUE WHERE id = $1', [orden_id]);

    const clienteRes = await pool.query(`
      SELECT c.correo FROM ordenes o
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      WHERE o.id = $1
    `, [orden_id]);

    const destinatario = clienteRes.rows[0]?.correo;
    if (destinatario) {
      await enviarCorreoPresupuesto(destinatario, orden_id);
    }

    res.json({ mensaje: 'Presupuesto actualizado y notificado al cliente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar presupuesto' });
  }
};

exports.obtenerListasEntrega = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.estado_actual, c.nombre AS cliente, e.marca, e.modelo
      FROM ordenes o
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      WHERE o.estado_actual = 'lista para entrega'
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener equipos listos para entrega' });
  }
};

exports.entregarOrden = async (req, res) => {
  const { orden_id } = req.body;
  try {
    await pool.query(
      'UPDATE ordenes SET estado_actual = $1 WHERE id = $2',
      ['entregado', orden_id]
    );

    await pool.query(
      'INSERT INTO estados (orden_id, estado) VALUES ($1, $2)',
      [orden_id, 'entregado']
    );

    res.json({ mensaje: 'Orden marcada como entregada al cliente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar entrega' });
  }
};