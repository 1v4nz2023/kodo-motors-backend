/**
 * Controlador de Reservas: recibe la petición, llama al servicio y responde JSON.
 * Delega los errores automáticamente con asyncHandler (Semana 10, Slide 9, 22).
 */
const asyncHandler = require('../utils/asyncHandler');
const servicio = require('../services/reserva.service');

const listar = asyncHandler(async (req, res) => {
  const reservas = await servicio.listar(req.query);
  res.status(200).json(reservas);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const reserva = await servicio.obtenerPorId(Number(req.params.id));
  res.status(200).json(reserva);
});

const crear = asyncHandler(async (req, res) => {
  const reserva = await servicio.crear(req.body);
  res.status(201).json(reserva);
});

const actualizar = asyncHandler(async (req, res) => {
  const reserva = await servicio.actualizar(Number(req.params.id), req.body);
  res.status(200).json(reserva);
});

const eliminar = asyncHandler(async (req, res) => {
  await servicio.eliminar(Number(req.params.id));
  res.status(204).send();
});

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
