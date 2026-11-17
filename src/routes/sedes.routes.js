// Rutas de sedes: se montan en /api/sedes
// Orden de cada ruta: credencial (401) → rol (403) → validación (400) → controlador (404 / 409)
const { Router } = require('express');
const controladorSedes = require('../controllers/sedes.controller');
const { autenticar, autorizar } = require('../middlewares/auth');
const { idParam, soloCamposPermitidos } = require('../validators/common');
const validar = require('../validators/validar');
const { reglasSede } = require('../validators/sedes.validators');
const { CAMPOS_PERMITIDOS } = require('../models/sede.model');

const enrutador = Router();

// Ninguna ruta de sedes queda expuesta: todas piden x-api-key
enrutador.use(autenticar);

const soloAdmin = autorizar('admin');
const camposDeSede = soloCamposPermitidos(CAMPOS_PERMITIDOS);

// Lectura: basta la llave
enrutador.get('/', controladorSedes.obtenerSedes);
enrutador.get('/:id', idParam(), validar, controladorSedes.obtenerSedePorId);

// Escritura: además exige el rol admin
enrutador.post('/', soloAdmin, reglasSede(), validar, camposDeSede, controladorSedes.registrarSede);
enrutador.put('/:id', soloAdmin, idParam(), reglasSede(true), validar, camposDeSede, controladorSedes.modificarSede);
enrutador.delete('/:id', soloAdmin, idParam(), validar, controladorSedes.borrarSede);

module.exports = enrutador;
