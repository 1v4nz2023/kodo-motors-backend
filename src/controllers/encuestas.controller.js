/**
 * Controlador: Gestión HTTP de Encuestas de Satisfacción (Kodo Motors) — Semana 10
 * Delega la lógica de negocio al servicio y los errores al middleware central.
 * Envuelto con asyncHandler para capturar rechazos asíncronos automáticamente (Slide 22).
 */
const asyncHandler = require('../utils/asyncHandler');
const encuestasService = require('../services/encuestas.service');

const listar = asyncHandler(async (req, res) => {
  const encuestas = await encuestasService.listar(req.query);
  res.status(200).json(encuestas);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const encuesta = await encuestasService.obtenerPorId(Number(req.params.id));
  res.status(200).json(encuesta);
});

const crear = asyncHandler(async (req, res) => {
  const nueva = await encuestasService.crear(req.body);
  res.status(201).json(nueva);
});

const actualizar = asyncHandler(async (req, res) => {
  const actualizada = await encuestasService.actualizar(Number(req.params.id), req.body);
  res.status(200).json(actualizada);
});

const eliminar = asyncHandler(async (req, res) => {
  await encuestasService.eliminar(Number(req.params.id));
  res.status(204).send();
});

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
