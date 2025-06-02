const pool = require('../db');

// Cliente aprueba o rechaza reparación
exports.aprobarReparacion = async (req, res) => {
  const { orden_id, aprobado } = req.body;

  try {
    // Actualiza la orden con el estado de aprobación
    await pool.query(
      'UPDATE ordenes SET requiere_autorizacion = TRUE, autorizado = $1, aprobado = $1 WHERE id = $2',
      [aprobado, orden_id]
    );

    if (!aprobado) {
      // Generar factura por diagnóstico ($10 + 15% IVA = $11.50)
      const monto = 10.00 * 1.15;
      const result = await pool.query(
        'INSERT INTO facturas (orden_id, monto, tipo) VALUES ($1, $2, $3) RETURNING *',
        [orden_id, monto.toFixed(2), 'diagnostico']
      );

      return res.json({
        mensaje: 'Reparación rechazada. Factura por diagnóstico generada.',
        factura: result.rows[0]
      });
    }

    res.json({ mensaje: 'Presupuesto aprobado. Esperando reparación para generar factura.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar aprobación o rechazo' });
  }
};

// Registrar pago de factura
exports.registrarPago = async (req, res) => {
  const { factura_id, metodo_pago = 'efectivo', monto_pagado = null } = req.body;

  try {
    // Insertar pago
    await pool.query(
      'INSERT INTO pagos (factura_id, metodo_pago, monto_pagado) VALUES ($1, $2, $3)',
      [factura_id, metodo_pago, monto_pagado]
    );

    // Marcar factura como pagada
    await pool.query(
      'UPDATE facturas SET pagado = TRUE WHERE id = $1',
      [factura_id]
    );

    // Obtener orden relacionada
    const ordenRes = await pool.query(
      'SELECT orden_id FROM facturas WHERE id = $1',
      [factura_id]
    );

    const orden_id = ordenRes.rows[0]?.orden_id;
    if (!orden_id) return res.status(404).json({ mensaje: 'Orden no encontrada para esta factura' });

    // Cambiar estado de orden a lista para entrega
    await pool.query(
      'UPDATE ordenes SET estado_actual = $1 WHERE id = $2',
      ['lista para entrega', orden_id]
    );

    // Agregar al historial de estados
    await pool.query(
      'INSERT INTO estados (orden_id, estado) VALUES ($1, $2)',
      [orden_id, 'lista para entrega']
    );

    console.log(`💰 Cliente pagó la factura. Orden ${orden_id} lista para entrega.`);
    res.json({ mensaje: 'Pago registrado. Orden lista para entrega.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar pago' });
  }
};

// Facturas pendientes (para el administrador)
exports.obtenerFacturasPendientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, c.nombre AS cliente, f.tipo AS motivo, f.monto AS total
      FROM facturas f
      JOIN ordenes o ON f.orden_id = o.id
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      WHERE f.pagado = false
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener facturas pendientes' });
  }
};

// Facturas por ID de cliente
exports.obtenerFacturasPorCliente = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT f.id, f.monto, f.tipo, f.pagado, o.id AS orden_id, e.marca, e.modelo
      FROM facturas f
      JOIN ordenes o ON f.orden_id = o.id
      JOIN equipos e ON o.equipo_id = e.id
      WHERE e.cliente_id = $1
      ORDER BY f.id DESC
    `, [cliente_id]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener facturas del cliente' });
  }
};

// Facturas por correo del cliente
exports.obtenerFacturasPorCorreo = async (req, res) => {
  const { correo } = req.params;
  try {
    const result = await pool.query(`
      SELECT f.id, f.monto, f.tipo, f.pagado, o.id AS orden_id, e.marca, e.modelo
      FROM facturas f
      JOIN ordenes o ON f.orden_id = o.id
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      WHERE c.correo = $1
      ORDER BY f.id DESC
    `, [correo]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener facturas del cliente por correo' });
  }
};

// Obtener facturas pagadas (para el historial del admin)
exports.getFacturasPagadas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.id AS factura_id,
        c.nombre AS cliente,
        f.tipo AS motivo,
        f.monto AS total,
        f.fecha_pago
      FROM facturas f
      JOIN ordenes o ON f.orden_id = o.id
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      WHERE f.pagado = true
      ORDER BY f.fecha_pago DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener facturas pagadas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};