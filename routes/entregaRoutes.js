const express = require('express');
const router = express.Router();
const entregaController = require('../controllers/entregaController');

router.post('/entregar', entregaController.entregarEquipo);

module.exports = router;