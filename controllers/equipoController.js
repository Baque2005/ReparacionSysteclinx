const pool = require('../db');

exports.registrarEquipo = async (req, res) => {
  const { cliente_id, marca, modelo, imei, descripcion, fotos, tecnico_id } = req.body;

  try {
    // 1. Insertar equipo
    const equipo = await pool.query(
      'INSERT INTO equipos (cliente_id, marca, modelo, imei, descripcion, fotos) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [cliente_id, marca, modelo, imei, descripcion, fotos]
    );

    // 2. Crear orden de reparación
    const orden = await pool.query(
      'INSERT INTO ordenes (equipo_id, tecnico_id, estado_actual) VALUES ($1, $2, $3) RETURNING *',
      [equipo.rows[0].id, tecnico_id || null, 'en revisión']
    );

    // 3. Insertar primer estado
    await pool.query(
      'INSERT INTO estados (orden_id, estado) VALUES ($1, $2)',
      [orden.rows[0].id, 'en revisión']
    );

    res.json({ equipo: equipo.rows[0], orden: orden.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar equipo u orden' });
  }
};