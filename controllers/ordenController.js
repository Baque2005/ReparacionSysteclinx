const pool = require('../db');
const {
  enviarCorreoBienvenida,
  enviarCorreoReset,
  enviarCorreoPresupuesto,
  generarPassword
} = require('../utils/mailer');

// Asignar técnico a orden
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

// Obtener órdenes del técnico (con aprobado)
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
    res.status(500).json({ mensaje: 'Error al obtener órdenes' });
  }
};

// Actualizar estado (y generar factura si reparado)
exports.actualizarEstadoOrden = async (req, res) => {
  const { orden_id, nuevo_estado, tecnico_id } = req.body;

  try {
    // Actualizar el estado
    await pool.query(
      'UPDATE ordenes SET estado_actual = $1 WHERE id = $2',
      [nuevo_estado, orden_id]
    );

    // Registrar en tabla de estados
    await pool.query(
      'INSERT INTO estados (orden_id, estado, tecnico_id) VALUES ($1, $2, $3)',
      [orden_id, nuevo_estado, tecnico_id]
    );

    // Registrar en historial técnico
    await pool.query(
      'INSERT INTO historial_tecnico (orden_id, tecnico_id, descripcion) VALUES ($1, $2, $3)',
      [orden_id, tecnico_id, `Cambio estado a "${nuevo_estado}"`]
    );

    // 💡 Lógica especial si se marca como "rechazado" (finalización por rechazo)
    if (nuevo_estado === 'rechazado') {
      const costoDiagnostico = 10.00;
      const iva = 0.15;
      const total = parseFloat((costoDiagnostico * (1 + iva)).toFixed(2));

      await pool.query(
        'INSERT INTO facturas (orden_id, monto, tipo) VALUES ($1, $2, $3)',
        [orden_id, total, 'diagnostico']
      );

      // Marcar la orden como lista para entrega
      await pool.query(
        'UPDATE ordenes SET estado_actual = $1 WHERE id = $2',
        ['lista para entrega', orden_id]
      );

      // Registrar evento de transición a entrega
      await pool.query(
        'INSERT INTO estados (orden_id, estado, tecnico_id) VALUES ($1, $2, $3)',
        [orden_id, 'lista para entrega', tecnico_id]
      );

      await pool.query(
        'INSERT INTO historial_tecnico (orden_id, tecnico_id, descripcion) VALUES ($1, $2, $3)',
        [orden_id, tecnico_id, 'Finalizó orden por rechazo del cliente. Generada factura de diagnóstico.']
      );

      console.log(`🧾 Factura por diagnóstico generada ($${total}) para orden ${orden_id}`);
    }

    // ✅ Si es reparado, generar factura completa
    if (nuevo_estado === 'reparado') {
      const materiales = await pool.query(
        'SELECT precio FROM presupuestos WHERE orden_id = $1',
        [orden_id]
      );

      const totalMateriales = materiales.rows.reduce((acc, m) => acc + Number(m.precio), 0);
      const costoDiagnostico = 10.00;
      const totalFinal = parseFloat((totalMateriales + costoDiagnostico).toFixed(2));

      await pool.query(
        'INSERT INTO facturas (orden_id, monto, tipo) VALUES ($1, $2, $3)',
        [orden_id, totalFinal, 'reparacion']
      );

      console.log(`🧾 Factura generada: $${totalFinal} (diagnóstico + materiales) para orden ${orden_id}`);
    }

    res.json({ mensaje: 'Estado actualizado y registrado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar estado' });
  }
};

// Obtener órdenes pendientes
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

// Guardar presupuesto
exports.guardarPresupuesto = async (req, res) => {
  const { orden_id, materiales } = req.body;

  try {
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

    res.json({ mensaje: 'Presupuesto guardado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar presupuesto' });
  }
};

// Listas para entrega
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

// Confirmar entrega final
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

    res.json({ mensaje: 'Orden marcada como entregada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al entregar orden' });
  }
};