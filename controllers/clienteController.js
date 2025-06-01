const pool = require('../db');

exports.crearCliente = async (req, res) => {
  const { nombre, telefono, correo } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nombre, telefono, correo) VALUES ($1, $2, $3) RETURNING *',
      [nombre, telefono, correo]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar cliente' });
  }
};