/**
 * Rutas: Endpoints del recurso Encuestas (Kodo Motors) — Semana 10
 * Prefijo: /api/encuestas · DELETE es borrado lógico
 * Orden de middlewares: validación de formato -> validación de negocio -> controlador
 */
const { Router } = require('express');
const encuestasController = require('../controllers/encuestas.controller');
const { idParam } = require('../validators/common');
const validar = require('../validators/validar');
const {
  reglasCrearEncuesta,
  reglasActualizarEncuesta,
  reglasFiltrosEncuestas,
} = require('../validators/encuestas.validators');

const router = Router();

router.get('/', reglasFiltrosEncuestas(), validar, encuestasController.listar);
router.get('/:id', idParam(), validar, encuestasController.obtenerPorId);
router.post('/', reglasCrearEncuesta(), validar, encuestasController.crear);
router.put('/:id', idParam(), reglasActualizarEncuesta(), validar, encuestasController.actualizar);
router.delete('/:id', idParam(), validar, encuestasController.eliminar);

module.exports = router;
