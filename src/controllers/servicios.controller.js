// Controlador de servicios: recibe req, llama al servicio y responde; delega errores con asyncHandler (Semana 10, Slide 9, 22)
const asyncHandler = require('../utils/asyncHandler');
const logicaServicios = require('../services/servicios.service');

const obtenerServicios = asyncHandler(async (req, res) => {
  const listaServicios = await logicaServicios.listarServicios(req.query);
  res.status(200).json(listaServicios);
});

const obtenerServicioPorId = asyncHandler(async (req, res) => {
  const servicio = await logicaServicios.buscarServicioPorId(Number(req.params.id));
  res.status(200).json(servicio);
});

const registrarServicio = asyncHandler(async (req, res) => {
  const servicioNuevo = await logicaServicios.crearServicio(req.body);
  res.status(201).json(servicioNuevo);
});

const modificarServicio = asyncHandler(async (req, res) => {
  const servicioActualizado = await logicaServicios.actualizarServicio(Number(req.params.id), req.body);
  res.status(200).json(servicioActualizado);
});

const borrarServicio = asyncHandler(async (req, res) => {
  await logicaServicios.eliminarServicio(Number(req.params.id));
  res.status(204).send();
});

module.exports = {
  obtenerServicios,
  obtenerServicioPorId,
  registrarServicio,
  modificarServicio,
  borrarServicio,
};
