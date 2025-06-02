const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');
const { verificarToken } = require('../middlewares/auth');

router.get('/cliente/:cliente_id', consultaController.obtenerOrdenesPorCliente);
router.get('/historial/:orden_id', consultaController.obtenerHistorialDeOrden);
router.get('/reporte/tecnico/:tecnico_id', consultaController.reporteTecnico);
router.get('/resumen', verificarToken, consultaController.obtenerResumen);
router.get('/presupuestos/:cliente_id', verificarToken, consultaController.obtenerPresupuestosPendientes);
router.get('/presupuesto/:orden_id', verificarToken, consultaController.obtenerPresupuestoPorOrden);
router.get('/cliente-por-correo/:correo', consultaController.obtenerOrdenesPorCorreo);
router.get('/facturas-pagadas', verificarToken, consultaController.obtenerFacturasPagadas);
router.get('/facturas/pendientes', verificarToken, consultaController.obtenerFacturasPendientes);
router.put('/ordenes/:orden_id/aprobacion', consultaController.actualizarAprobacionPresupuesto);
router.get('/ordenes/listas-entrega', verificarToken, consultaController.obtenerOrdenesListasParaEntrega);

module.exports = router;