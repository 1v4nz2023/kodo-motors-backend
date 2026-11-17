// Servicio de servicios: reglas de negocio según Semana 10 (Slides 23, 24, 34)
// Lanza errores tipados (NotFoundError, ConflictError, BadRequestError)
const repositorio = require('../repositories/servicios.repository');
const repositorioReservas = require('../repositories/reserva.repository');
const modelo = require('../models/servicio.model');
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require('../middlewares/errors/AppError');
const { hoyISO } = require('../validators/common');

async function listarServicios(filtros = {}) {
  const filtrosLimpios = modelo.validarFiltros(filtros);
  return repositorio.listar(filtrosLimpios);
}

async function buscarServicioPorId(id) {
  const servicio = await repositorio.buscarPorId(id);
  if (!servicio) {
    throw new NotFoundError(`No existe un servicio con id ${id}`);
  }
  return servicio;
}

// El nombre es único también frente a los servicios dados de baja (Slide 15, 24)
async function verificarNombreLibre(nombre, idActual = null) {
  const otro = await repositorio.buscarPorNombre(nombre);
  if (!otro || otro.id === idActual) return;
  if (otro.activo) {
    throw new ConflictError(`Ya existe un servicio con el nombre "${nombre}"`);
  }
  throw new ConflictError(`El nombre "${nombre}" pertenece a un servicio dado de baja (id ${otro.id})`);
}

async function crearServicio(datos) {
  modelo.revisarCampos(datos);
  const servicioLimpio = modelo.validarServicio(datos);
  await verificarNombreLibre(servicioLimpio.nombre);

  const idNuevo = await repositorio.crear(servicioLimpio);
  return buscarServicioPorId(idNuevo);
}

async function actualizarServicio(id, cambios) {
  modelo.revisarCampos(cambios);
  if (Object.keys(cambios).length === 0) {
    throw new BadRequestError('Envía al menos un campo para actualizar');
  }

  const servicioActual = await buscarServicioPorId(id);

  const servicioCombinado = { ...servicioActual, ...cambios };
  const servicioLimpio = modelo.validarServicio(servicioCombinado);
  await verificarNombreLibre(servicioLimpio.nombre, id);

  await repositorio.actualizar(id, servicioLimpio);
  return buscarServicioPorId(id);
}

async function eliminarServicio(id) {
  const citasPendientes = await repositorioReservas.contarCitasPendientesDeServicio(id, hoyISO());
  if (citasPendientes > 0) {
    throw new ConflictError(`No se puede dar de baja el servicio: tiene citas generadas pendientes (${citasPendientes})`);
  }

  const eliminado = await repositorio.eliminar(id);
  if (!eliminado) {
    throw new NotFoundError(`No existe un servicio con id ${id}`);
  }
}

module.exports = {
  listarServicios,
  buscarServicioPorId,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
};
