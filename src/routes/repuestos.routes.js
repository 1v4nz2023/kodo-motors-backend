/**
 * Rutas: Endpoints del recurso Repuestos (Kodo Motors) — Semana 10
 * Prefijo: /api/repuestos · DELETE es borrado lógico
 * Orden de middlewares: validación de formato -> validación de negocio -> controlador
 */
const { Router } = require('express');
const repuestosController = require('../controllers/repuestos.controller');
const { idParam } = require('../validators/common');
const validar = require('../validators/validar');
const {
  reglasRepuesto,
  reglasFiltrosRepuestos,
} = require('../validators/repuestos.validators');

const router = Router();

router.get('/', reglasFiltrosRepuestos(), validar, repuestosController.listar);
router.get('/:id', idParam(), validar, repuestosController.obtenerPorId);
router.post('/', reglasRepuesto(false), validar, repuestosController.crear);
router.put('/:id', idParam(), reglasRepuesto(true), validar, repuestosController.actualizar);
router.delete('/:id', idParam(), validar, repuestosController.eliminar);

module.exports = router;
