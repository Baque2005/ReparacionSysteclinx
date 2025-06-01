const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'mi_secreto_ultra_seguro';

exports.verificarToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token)
    return res.status(403).json({ mensaje: 'Token requerido' });

  try {
    const decoded = jwt.verify(token.split(' ')[1], SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

// Verifica rol específico (admin, tecnico, cliente)
exports.verificarRol = (rolEsperado) => {
  return (req, res, next) => {
    if (req.usuario.rol !== rolEsperado) {
      return res.status(403).json({ mensaje: 'Acceso denegado: Rol incorrecto' });
    }
    next();
  };
};