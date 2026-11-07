// Controlador de sedes: recibe req, llama al servicio y responde; delega errores con asyncHandler (Semana 10, Slide 9, 22)
const asyncHandler = require('../utils/asyncHandler');
const logicaSedes = require('../services/sedes.service');

const obtenerSedes = asyncHandler(async (req, res) => {
  const listaSedes = await logicaSedes.listarSedes(req.query);
  res.status(200).json(listaSedes);
});

const obtenerSedePorId = asyncHandler(async (req, res) => {
  const sede = await logicaSedes.buscarSedePorId(Number(req.params.id));
  res.status(200).json(sede);
});

const registrarSede = asyncHandler(async (req, res) => {
  const sedeNueva = await logicaSedes.crearSede(req.body);
  res.status(201).json(sedeNueva);
});

const modificarSede = asyncHandler(async (req, res) => {
  const sedeActualizada = await logicaSedes.actualizarSede(Number(req.params.id), req.body);
  res.status(200).json(sedeActualizada);
});

const borrarSede = asyncHandler(async (req, res) => {
  await logicaSedes.eliminarSede(Number(req.params.id));
  res.status(204).send();
});

module.exports = {
  obtenerSedes,
  obtenerSedePorId,
  registrarSede,
  modificarSede,
  borrarSede,
};
