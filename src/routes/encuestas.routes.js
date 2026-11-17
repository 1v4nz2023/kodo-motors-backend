/**
 * Rutas: Endpoints del recurso Encuestas (Kodo Motors)
 * Prefijo: /api/encuestas · DELETE es borrado lógico
 */
const { Router } = require('express');
const encuestasController = require('../controllers/encuestas.controller');
const { idParam } = require('../validators/common');
const validar = require('../validators/validar');
const { reglasEncuesta, reglasFiltrosEncuesta } = require('../validators/encuestas.validators');

const router = Router();

// Handlers pasados por referencia (sin paréntesis)
router.get('/', reglasFiltrosEncuesta(), validar, encuestasController.listar);
router.get('/:id', idParam(), validar, encuestasController.obtenerPorId);
router.post('/', reglasEncuesta(), validar, encuestasController.crear);
router.put('/:id', idParam(), reglasEncuesta(true), validar, encuestasController.actualizar);
router.delete('/:id', idParam(), validar, encuestasController.eliminar);

module.exports = router;
