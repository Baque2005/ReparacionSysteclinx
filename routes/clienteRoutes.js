const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { verificarToken } = require('../middlewares/auth');

router.post('/crear', verificarToken, clienteController.crearCliente);

module.exports = router;