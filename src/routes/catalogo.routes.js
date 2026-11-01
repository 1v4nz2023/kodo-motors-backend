/**
 * Rutas del recurso Catálogo. Se montan en /api/catalogo desde src/routes/index.js.
 *
 *   GET    /api/catalogo          lista (?incluir_inactivos=true muestra también los de baja)
 *   GET    /api/catalogo/:id      un vehículo
 *   POST   /api/catalogo          crea
 *   PUT    /api/catalogo/:id      actualiza
 *   DELETE /api/catalogo/:id      da de baja (borrado lógico)
 */
const { Router } = require('express');
const catalogoController = require('../controllers/catalogo.controller');
const { idParam } = require('../validators/common');
const validar = require('../validators/validar');
const { reglasCatalogo } = require('../validators/catalogo.validators');

const router = Router();

router.get('/', catalogoController.listar);
router.get('/:id', idParam(), validar, catalogoController.obtenerPorId);
router.post('/', reglasCatalogo(), validar, catalogoController.crear);
router.put('/:id', idParam(), reglasCatalogo(), validar, catalogoController.actualizar);
router.delete('/:id', idParam(), validar, catalogoController.eliminar);

module.exports = router;
