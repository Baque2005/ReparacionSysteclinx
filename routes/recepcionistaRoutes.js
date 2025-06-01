const express = require('express');
const router = express.Router();
const controller = require('../controllers/recepcionistaController');
const { verificarToken, verificarRol } = require('../middlewares/auth');

router.post('/registrar-orden', verificarToken, verificarRol('recepcionista'), controller.registrarOrdenCompleta);

// NUEVA RUTA para historial de clientes
router.get('/clientes', verificarToken, controller.obtenerClientes);

module.exports = router;