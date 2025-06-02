const express = require('express');
const router = express.Router();
const ordenController = require('../controllers/ordenController');

// Nueva ruta para AdminPanel
router.get('/pendientes', ordenController.obtenerOrdenesPendientes);
router.post('/asignar', ordenController.asignarTecnico);

// Para técnicos
router.get('/tecnico/:tecnico_id', ordenController.obtenerOrdenesPorTecnico);
router.post('/actualizar-estado', ordenController.actualizarEstadoOrden);
router.post('/presupuesto', ordenController.guardarPresupuesto);
router.get('/listas-entrega', ordenController.obtenerListasEntrega);
router.post('/entregar', ordenController.entregarOrden);

module.exports = router;