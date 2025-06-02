const pool = require('../db');

// Cliente aprueba o rechaza reparación
exports.aprobarReparacion = async (req, res) => {
  const { orden_id, aprobado } = req.body;

  try {
    // Actualizar autorización
    await pool.query(
      'UPDATE ordenes SET requiere_autorizacion = TRUE, autorizado = $1, aprobado = $1 WHERE id = $2',
      [aprobado, orden_id]
    );

    if (!aprobado) {
      // Buscar datos del cliente
      const clienteRes = await pool.query(`
        SELECT c.correo
        FROM ordenes o
        JOIN equipos e ON o.equipo_id = e.id
        JOIN clientes c ON e.cliente_id = c.id
        WHERE o.id = $1
      `, [orden_id]);

      const correo_cliente = clienteRes.rows[0]?.correo;

      if (!correo_cliente) {
        return res.status(404).json({ mensaje: 'No se encontró el correo del cliente para la orden' });
      }

      // Generar factura de diagnóstico ($10 + IVA 15%)
      const monto = 10;
      const iva = 0.15;
      const total = +(monto + monto * iva).toFixed(2);

      await pool.query(`
        INSERT INTO facturas (orden_id, correo_cliente, monto, tipo, concepto, pagado)
        VALUES ($1, $2, $3, 'diagnostico', 'Diagnóstico técnico', false)
      `, [orden_id, correo_cliente, total]);

      return res.json({ mensaje: 'Presupuesto rechazado. Factura de diagnóstico generada.' });
    }

    res.json({ mensaje: 'Presupuesto aprobado. Factura se generará al finalizar la reparación.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar aprobación o rechazo' });
  }
};

// Registrar pago
exports.registrarPago = async (req, res) => {
  const { factura_id, metodo_pago, monto_pagado } = req.body;

  try {
    await pool.query(
      'INSERT INTO pagos (factura_id, metodo_pago, monto_pagado) VALUES ($1, $2, $3)',
      [factura_id, metodo_pago, monto_pagado]
    );

    await pool.query(
      'UPDATE facturas SET pagado = TRUE WHERE id = $1',
      [factura_id]
    );

    const ordenRes = await pool.query(
      'SELECT orden_id FROM facturas WHERE id = $1',
      [factura_id]
    );

    const orden_id = ordenRes.rows[0].orden_id;

    await pool.query(
      'UPDATE ordenes SET estado_actual = $1 WHERE id = $2',
      ['lista para entrega', orden_id]
    );

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

// Obtener facturas pendientes
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

// Obtener facturas por ID de cliente
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

// Obtener facturas por correo del cliente
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

// Obtener facturas pagadas con fecha de pago
exports.obtenerFacturasPagadas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.id AS factura_id, 
        c.nombre AS cliente, 
        f.tipo AS motivo, 
        f.monto AS total, 
        p.fecha_pago
      FROM facturas f
      JOIN ordenes o ON f.orden_id = o.id
      JOIN equipos e ON o.equipo_id = e.id
      JOIN clientes c ON e.cliente_id = c.id
      JOIN pagos p ON f.id = p.factura_id
      WHERE f.pagado = true
      ORDER BY p.fecha_pago DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener facturas pagadas' });
  }
};