const express = require('express');
const router = express.Router();
const equipoController = require('../controllers/equipoController');

router.post('/registrar', equipoController.registrarEquipo);

module.exports = router;