/**
 * Rutas: Endpoints del recurso Repuestos (Kodo Motors)
 * Prefijo: /api/repuestos · DELETE es borrado lógico
 */
const { Router } = require('express');
const repuestosController = require('../controllers/repuestos.controller');
const validarId = require('../middlewares/validarId');
const validar = require('../validators/validar');
const { reglasRepuesto } = require('../validators/repuestos.validators');

const router = Router();

// Handlers pasados por referencia (sin paréntesis)
router.get('/', repuestosController.listar);
router.get('/:id', validarId, repuestosController.obtenerPorId);
router.post('/', reglasRepuesto(), validar, repuestosController.crear);
router.put('/:id', validarId, reglasRepuesto(true), validar, repuestosController.actualizar);
router.delete('/:id', validarId, repuestosController.eliminar);

module.exports = router;
