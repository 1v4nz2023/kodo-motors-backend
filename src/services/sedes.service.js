// Servicio de sedes: reglas de negocio según Semana 10 (Slides 23, 24, 34)
// Lanza errores tipados (NotFoundError, ConflictError, BadRequestError)
const repositorio = require('../repositories/sedes.repository');
const repositorioReservas = require('../repositories/reserva.repository');
const modelo = require('../models/sede.model');
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require('../middlewares/errors/AppError');
const { hoyISO } = require('../validators/common');

async function listarSedes(filtros = {}) {
  const filtrosLimpios = modelo.validarFiltros(filtros);
  return repositorio.listar(filtrosLimpios);
}

async function buscarSedePorId(id) {
  const sede = await repositorio.buscarPorId(id);
  if (!sede) {
    throw new NotFoundError(`No existe una sede con id ${id}`);
  }
  return sede;
}

// El nombre es único también frente a las sedes dadas de baja (Slide 15, 24)
async function verificarNombreLibre(nombre, idActual = null) {
  const otra = await repositorio.buscarPorNombre(nombre);
  if (!otra || otra.id === idActual) return;
  if (otra.activa) {
    throw new ConflictError(`Ya existe una sede con el nombre "${nombre}"`);
  }
  throw new ConflictError(`El nombre "${nombre}" pertenece a una sede dada de baja (id ${otra.id})`);
}

async function crearSede(datos) {
  modelo.revisarCampos(datos);
  const sedeLimpia = modelo.validarSede(datos);
  await verificarNombreLibre(sedeLimpia.nombre);

  const idNuevo = await repositorio.crear(sedeLimpia);
  return buscarSedePorId(idNuevo);
}

async function actualizarSede(id, cambios) {
  modelo.revisarCampos(cambios);
  if (Object.keys(cambios).length === 0) {
    throw new BadRequestError('Envía al menos un campo para actualizar');
  }

  const sedeActual = await buscarSedePorId(id);

  const sedeCombinada = { ...sedeActual, ...cambios };
  const sedeLimpia = modelo.validarSede(sedeCombinada);
  await verificarNombreLibre(sedeLimpia.nombre, id);

  await repositorio.actualizar(id, sedeLimpia);
  return buscarSedePorId(id);
}

async function eliminarSede(id) {
  const citasPendientes = await repositorioReservas.contarCitasPendientesDeSede(id, hoyISO());
  if (citasPendientes > 0) {
    throw new ConflictError(`No se puede dar de baja la sede: tiene citas generadas pendientes (${citasPendientes})`);
  }

  const eliminada = await repositorio.eliminar(id);
  if (!eliminada) {
    throw new NotFoundError(`No existe una sede con id ${id}`);
  }
}

module.exports = {
  listarSedes,
  buscarSedePorId,
  crearSede,
  actualizarSede,
  eliminarSede,
};
