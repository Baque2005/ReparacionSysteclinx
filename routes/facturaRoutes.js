const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');
const { verificarToken } = require('../middlewares/auth');

router.get('/pendientes', facturaController.obtenerFacturasPendientes); 
router.get('/pagadas', facturaController.obtenerFacturasPagadas); // ✅ NUEVA RUTA
router.post('/aprobar', facturaController.aprobarReparacion);
router.post('/pago', facturaController.registrarPago);
router.get('/cliente/:cliente_id', verificarToken, facturaController.obtenerFacturasPorCliente);
router.get('/cliente-correo/:correo', verificarToken, facturaController.obtenerFacturasPorCorreo);

module.exports = router;