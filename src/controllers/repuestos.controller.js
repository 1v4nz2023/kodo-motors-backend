/**
 * Controlador: Gestión HTTP de Repuestos (Kodo Motors) — Semana 10
 * Delega la lógica de negocio al servicio y los errores al middleware central.
 * Envuelto con asyncHandler para capturar rechazos asíncronos automáticamente (Slide 22).
 */
const asyncHandler = require('../utils/asyncHandler');
const repuestosService = require('../services/repuestos.service');

const listar = asyncHandler(async (req, res) => {
  const repuestos = await repuestosService.listar(req.query);
  res.status(200).json(repuestos);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const repuesto = await repuestosService.obtenerPorId(Number(req.params.id));
  res.status(200).json(repuesto);
});

const crear = asyncHandler(async (req, res) => {
  const nuevo = await repuestosService.crear(req.body);
  res.status(201).json(nuevo);
});

const actualizar = asyncHandler(async (req, res) => {
  const actualizado = await repuestosService.actualizar(Number(req.params.id), req.body);
  res.status(200).json(actualizado);
});

const eliminar = asyncHandler(async (req, res) => {
  await repuestosService.eliminar(Number(req.params.id));
  res.status(204).send();
});

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
