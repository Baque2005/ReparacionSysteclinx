const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/auth'); // 👈 agregar esto

router.post('/login', authController.login);
router.post('/registro', authController.registrarUsuario);

// 👇 proteger esta ruta
router.post('/cambiar-contrasena', verificarToken, authController.cambiarContrasena);

module.exports = router;