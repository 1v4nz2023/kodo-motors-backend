// Enrutador principal: monta cada recurso bajo /api
const { Router } = require('express');
const { revisarSalud } = require('../controllers/salud.controller');
const { autenticar, autorizar } = require('../middlewares/auth');
const rutasSedes = require('./sedes.routes');
const rutasServicios = require('./servicios.routes');
const rutasCatalogo = require('./catalogo.routes');
const rutasReservas = require('./reserva.routes');
const rutasRepuestos = require('./repuestos.routes');
const rutasEncuestas = require('./encuestas.routes');
const rutasConsulta = require('./lookups.routes');

const enrutador = Router();

enrutador.get('/salud', revisarSalud);

// Endpoint de prueba para Autenticación y Autorización (Semana 10, Slide 28)
enrutador.get('/prueba-auth', autenticar, autorizar('admin'), (req, res) => {
  res.json({ ok: true, mensaje: 'Acceso autorizado como administrador' });
});

enrutador.use('/sedes', rutasSedes);
enrutador.use('/servicios', rutasServicios);
enrutador.use('/catalogo', rutasCatalogo);
enrutador.use('/reservas', rutasReservas);
enrutador.use('/repuestos', rutasRepuestos);
enrutador.use('/encuestas', rutasEncuestas);
enrutador.use('/', rutasConsulta);

module.exports = enrutador;
