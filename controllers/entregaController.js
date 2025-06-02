const pool = require('../db');

// Entrega del equipo y cierre de orden
exports.entregarEquipo = async (req, res) => {
  const { orden_id, observaciones } = req.body;

  try {
    // Verificar que esté "lista para entrega"
    const ordenRes = await pool.query(
      'SELECT estado_actual FROM ordenes WHERE id = $1',
      [orden_id]
    );

    const estadoActual = ordenRes.rows[0]?.estado_actual;

    if (estadoActual !== 'lista para entrega') {
      return res.status(400).json({
        mensaje: 'La orden no está lista para entrega. Debe estar pagada.'
      });
    }

    // Insertar confirmación en historial
    await pool.query(
      'INSERT INTO historial (orden_id, observaciones) VALUES ($1, $2)',
      [orden_id, observaciones]
    );

    // Cerrar la orden cambiando su estado a 'completado'
    await pool.query(
      'UPDATE ordenes SET estado_actual = $1 WHERE id = $2',
      ['completado', orden_id]
    );

    // Registrar el estado en la tabla de estados
    await pool.query(
      'INSERT INTO estados (orden_id, estado) VALUES ($1, $2)',
      [orden_id, 'completado']
    );

    console.log(`✅ Orden ${orden_id} completada y entregada al cliente.`);

    res.json({ mensaje: 'Orden completada y registrada en el historial.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al entregar el equipo' });
  }
};