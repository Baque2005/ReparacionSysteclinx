const pool = require('../db');

// Consultar órdenes por cliente
exports.obtenerOrdenesPorCliente = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT o.id as orden_id, o.estado_actual, o.aprobado, e.marca, e.modelo, e.descripcion
      FROM ordenes o
      JOIN equipos e ON o.equipo_id = e.id
      WHERE e.cliente_id = $1 AND o.autorizado = TRUE
    `, [cliente_id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar órdenes del cliente' });
  }
};

// Obtener historial de una orden
exports.obtenerHistorialDeOrden = async (req, res) => {
  const { orden_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT estado, fecha FROM estados WHERE orden_id = $1 ORDER BY fecha ASC',
      [orden_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener historial de orden' });
  }
};

// Reporte por técnico
exports.reporteTecnico = async (req, res) => {
  const { tecnico_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT estado_actual, COUNT(*) AS total
      FROM ordenes
      WHERE tecnico_id = $1
      GROUP BY estado_actual
    `, [tecnico_id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en reporte por técnico' });
  }
};

// Resumen general
exports.obtenerResumen = async (req, res) => {
  try {
    const totalOrdenesRes = await pool.query('SELECT COUNT(*) FROM ordenes');
    const ordenesCompletadasRes = await pool.query("SELECT COUNT(*) FROM ordenes WHERE estado_actual = 'entregada'");
    const totalTecnicosRes = await pool.query("SELECT COUNT(*) FROM usuarios WHERE rol = 'tecnico'");
    const totalFacturasRes = await pool.query('SELECT COUNT(*) FROM facturas');

    const estadosRes = await pool.query(`
      SELECT estado_actual AS estado, COUNT(*) AS cantidad
      FROM ordenes
      GROUP BY estado_actual
    `);

    res.json({
      total_ordenes: Number(totalOrdenesRes.rows[0].count),
      ordenes_completadas: Number(ordenesCompletadasRes.rows[0].count),
      total_tecnicos: Number(totalTecnicosRes.rows[0].count),
      total_facturas: Number(totalFacturasRes.rows[0].count),
      estados: estadosRes.rows.map(row => ({
        estado: row.estado,
        cantidad: Number(row.cantidad)
      }))
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ mensaje: 'Error al obtener resumen' });
  }
};

// Presupuestos pendientes por cliente
exports.obtenerPresupuestosPendientes = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT o.id AS orden_id, o.estado_actual, e.marca, e.modelo,
             ARRAY_AGG(json_build_object('material', p.material, 'precio', p.precio)) AS materiales
      FROM ordenes o
      JOIN equipos e ON o.equipo_id = e.id
      JOIN presupuestos p ON p.orden_id = o.id
      WHERE e.cliente_id = $1 AND o.estado_actual = 'diagnóstico'
      GROUP BY o.id, e.marca, e.modelo
    `, [cliente_id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener presupuestos pendientes' });
  }
};

// Obtener presupuesto por orden
exports.obtenerPresupuestoPorOrden = async (req, res) => {
  const { orden_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT material, precio
      FROM presupuestos
      WHERE orden_id = $1
    `, [orden_id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el presupuesto' });
  }
};

// Obtener órdenes por correo
exports.obtenerOrdenesPorCorreo = async (req, res) => {
  const { correo } = req.params;
  try {
    const result = await pool.query(`
      SELECT o.id as orden_id, o.estado_actual, o.aprobado, e.marca, e.modelo, e.descripcion
      FROM ordenes o
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      WHERE c.correo = $1 AND o.autorizado = TRUE
    `, [correo]);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al consultar órdenes por correo:', error);
    res.status(500).json({ mensaje: 'Error al consultar órdenes del cliente por correo' });
  }
};

// Obtener facturas pagadas
exports.obtenerFacturasPagadas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, cliente, motivo, total, fecha_pago
      FROM facturas
      WHERE pagado = true
      ORDER BY fecha_pago DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener facturas pagadas:', error);
    res.status(500).json({ mensaje: 'Error al obtener historial de facturas.' });
  }
};

// Obtener facturas pendientes
exports.obtenerFacturasPendientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, cliente, motivo, total
      FROM facturas
      WHERE pagado = false
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener facturas pendientes:', error);
    res.status(500).json({ mensaje: 'Error al obtener facturas pendientes.' });
  }
};

// Actualizar aprobación del presupuesto y generar factura
// Actualizar aprobación del presupuesto y generar factura
exports.actualizarAprobacionPresupuesto = async (req, res) => {
  const { orden_id } = req.params;
  const { aprobado } = req.body;
  try {
    // Actualizar campo 'aprobado' en la orden
    await pool.query(`UPDATE ordenes SET aprobado = $1 WHERE id = $2`, [aprobado, orden_id]);

    // Obtener datos del cliente y orden
    const datosOrden = await pool.query(`
      SELECT o.id AS orden_id, c.nombre AS cliente_nombre, c.correo, c.id AS cliente_id
      FROM ordenes o
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      WHERE o.id = $1
    `, [orden_id]);

    if (datosOrden.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' });
    }

    const clienteNombre = datosOrden.rows[0].cliente_nombre;
    const clienteID = datosOrden.rows[0].cliente_id;

    if (aprobado) {
      // Obtener materiales y calcular subtotal
      const materiales = await pool.query(`SELECT precio FROM presupuestos WHERE orden_id = $1`, [orden_id]);
      const subtotal = materiales.rows.reduce((acc, mat) => acc + Number(mat.precio), 0);
      const total = subtotal + 10;

      // Generar factura por reparación y diagnóstico
      await pool.query(`
        INSERT INTO facturas (cliente, motivo, total, pagado, cliente_id, orden_id)
        VALUES ($1, $2, $3, false, $4, $5)
      `, [clienteNombre, 'Reparación y diagnóstico', total, clienteID, orden_id]);
    } else {
      // Generar factura solo por diagnóstico (con IVA)
      const totalDiagnostico = 10 * 1.15;

      await pool.query(`
        INSERT INTO facturas (cliente, motivo, total, pagado, cliente_id, orden_id)
        VALUES ($1, $2, $3, false, $4, $5)
      `, [clienteNombre, 'Diagnóstico', totalDiagnostico, clienteID, orden_id]);

      // Cambiar estado a 'lista para entrega'
      await pool.query(`
        UPDATE ordenes SET estado_actual = 'lista para entrega' WHERE id = $1
      `, [orden_id]);

      // Registrar en historial técnico
      await pool.query(`
        INSERT INTO historial_tecnico (orden_id, descripcion)
        VALUES ($1, $2)
      `, [orden_id, 'El cliente rechazó el presupuesto. Se finalizó con diagnóstico.']);

      // Registrar en historial general para administrador
      await pool.query(`
        INSERT INTO historial (orden_id, descripcion)
        VALUES ($1, $2)
      `, [orden_id, 'Se emitió factura por diagnóstico tras rechazo del cliente.']);
    }

    res.json({ mensaje: 'Aprobación actualizada y factura generada correctamente.' });
  } catch (error) {
    console.error('Error al actualizar aprobación y generar factura:', error);
    res.status(500).json({ mensaje: 'Error al procesar la aprobación del cliente.' });
  }
};

// Obtener órdenes listas para entrega
exports.obtenerOrdenesListasParaEntrega = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.estado_actual, o.aprobado, c.nombre AS cliente, e.marca, e.modelo
      FROM ordenes o
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      WHERE o.estado_actual = 'lista para entrega'
    `);

    const ordenes = result.rows.map(orden => ({
      ...orden,
      estado_actual: orden.aprobado === false
        ? 'Rechazado por cliente'
        : 'Lista para entrega'
    }));

    res.json(ordenes);
  } catch (error) {
    console.error('Error al obtener órdenes listas para entrega:', error);
    res.status(500).json({ mensaje: 'Error al obtener órdenes listas para entrega' });
  }
};