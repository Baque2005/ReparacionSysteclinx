const pool = require('../db');

exports.obtenerTecnicos = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre FROM usuarios WHERE rol = $1', ['tecnico']);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener técnicos' });
  }
};