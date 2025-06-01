const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

router.get('/tecnicos', usuarioController.obtenerTecnicos);

module.exports = router;