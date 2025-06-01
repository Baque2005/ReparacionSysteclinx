const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'mi_secreto_ultra_seguro';

exports.registrarUsuario = async (req, res) => {
  const { nombre, correo, contraseña, rol } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contraseña, rol) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, correo, hashedPassword, rol]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar usuario' });
  }
};

exports.login = async (req, res) => {
  const { correo, contraseña } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: 'Correo no registrado' });
    }

    const usuario = result.rows[0];

    const passwordValida = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol,
        nombre: usuario.nombre,
      },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre,  correo: usuario.correo, rol: usuario.rol } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en login' });
  }
};
// Cambiar contraseña segura usando token
exports.cambiarContrasena = async (req, res) => {
  const usuario_id = req.usuario.id; // ✅ desde el token
  const { actual, nueva } = req.body;

  try {
    const result = await pool.query('SELECT contraseña FROM usuarios WHERE id = $1', [usuario_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const coincide = await bcrypt.compare(actual, result.rows[0].contraseña);
    if (!coincide) {
      return res.status(400).json({ mensaje: 'La contraseña actual es incorrecta' });
    }

    const nuevaHash = await bcrypt.hash(nueva, 10);
    await pool.query('UPDATE usuarios SET contraseña = $1 WHERE id = $2', [nuevaHash, usuario_id]);

    res.json({ mensaje: '✅ Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cambiar contraseña' });
  }
};