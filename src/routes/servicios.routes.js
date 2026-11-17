// Rutas de servicios: se montan en /api/servicios
// Orden de cada ruta: credencial (401) → rol (403) → validación (400) → controlador (404 / 409)
const { Router } = require('express');
const controladorServicios = require('../controllers/servicios.controller');
const { autenticar, autorizar } = require('../middlewares/auth');
const { idParam, soloCamposPermitidos } = require('../validators/common');
const validar = require('../validators/validar');
const { reglasServicio } = require('../validators/servicios.validators');
const { CAMPOS_PERMITIDOS } = require('../models/servicio.model');

const enrutador = Router();

// Ninguna ruta de servicios queda expuesta: todas piden x-api-key
enrutador.use(autenticar);

const soloAdmin = autorizar('admin');
const camposDeServicio = soloCamposPermitidos(CAMPOS_PERMITIDOS);

// Lectura: basta la llave
enrutador.get('/', controladorServicios.obtenerServicios);
enrutador.get('/:id', idParam(), validar, controladorServicios.obtenerServicioPorId);

// Escritura: además exige el rol admin
enrutador.post('/', soloAdmin, reglasServicio(), validar, camposDeServicio, controladorServicios.registrarServicio);
enrutador.put('/:id', soloAdmin, idParam(), reglasServicio(true), validar, camposDeServicio, controladorServicios.modificarServicio);
enrutador.delete('/:id', soloAdmin, idParam(), validar, controladorServicios.borrarServicio);

module.exports = enrutador;
