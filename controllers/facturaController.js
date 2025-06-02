const pool = require('../db');

// Cliente aprueba o rechaza reparación
exports.aprobarReparacion = async (req, res) => {
  const { orden_id, aprobado } = req.body;

  try {
    if (typeof aprobado !== 'boolean') {
      return res.status(400).json({ mensaje: 'El campo "aprobado" debe ser booleano.' });
    }

    // Actualizar campos de la orden
    await pool.query(
      'UPDATE ordenes SET requiere_autorizacion = TRUE, autorizado = $1 WHERE id = $2',
      [aprobado, orden_id]
    );

    if (!aprobado) {
      // Cliente rechaza: generar factura solo por diagnóstico
      const montoDiagnostico = 10;
      const iva = parseFloat((montoDiagnostico * 0.15).toFixed(2));
      const total = parseFloat((montoDiagnostico + iva).toFixed(2));

      await pool.query(
        `INSERT INTO facturas (orden_id, monto, tipo, pagado)
         VALUES ($1, $2, 'diagnostico', false)`,
        [orden_id, total]
      );

      await pool.query(
        'INSERT INTO estados (orden_id, estado) VALUES ($1, $2)',
        [orden_id, 'Presupuesto rechazado']
      );

      return res.json({
        mensaje: '❌ Reparación rechazada. Factura de diagnóstico generada.',
        factura: { monto: total, tipo: 'diagnostico' }
      });
    } else {
      // Cliente aprueba: calcular subtotal de diagnóstico + materiales
      const diagnostico = 10;

      const materialesRes = await pool.query(
        'SELECT material FROM presupuestos WHERE orden_id = $1',
        [orden_id]
      );

      let totalMateriales = 0;

      if (materialesRes.rows.length > 0) {
        const materiales = materialesRes.rows[0].material;

        if (Array.isArray(materiales)) {
          materiales.forEach(item => {
            if (item && typeof item.precio === 'number') {
              totalMateriales += item.precio;
            }
          });
        }
      }

      const subtotal = diagnostico + totalMateriales;
      const iva = parseFloat((subtotal * 0.15).toFixed(2));
      const total = parseFloat((subtotal + iva).toFixed(2));

      await pool.query(
        `INSERT INTO facturas (orden_id, monto, tipo, pagado)
         VALUES ($1, $2, 'reparacion', false)`,
        [orden_id, total]
      );

      await pool.query(
        'INSERT INTO estados (orden_id, estado) VALUES ($1, $2)',
        [orden_id, 'Presupuesto aprobado']
      );

      return res.json({
        mensaje: '✅ Presupuesto aprobado. Factura generada correctamente.',
        factura: {
          tipo: 'reparacion y diagnóstico',
          subtotal: subtotal.toFixed(2),
          iva: iva.toFixed(2),
          total: total.toFixed(2)
        }
      });
    }

  } catch (error) {
    console.error('❌ Error al procesar aprobación/rechazo:', error.message);
    res.status(500).json({ mensaje: 'Error interno al procesar la solicitud.' });
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

// Obtener facturas pendientes (no pagadas)
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

// Obtener facturas por cliente (por ID)
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

// Obtener facturas por correo
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

// Obtener facturas pagadas
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