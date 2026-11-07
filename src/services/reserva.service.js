/**
 * Servicio de Reservas: reglas de negocio según Semana 10 (Slides 23, 24, 34).
 * Valida los datos, verifica que existan sede/servicio/vehículo
 * y que no haya otra reserva en el mismo horario. Luego llama al repositorio.
 */
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
} = require('../errors/AppError');
const modelo = require('../models/reserva.model');
const repo = require('../repositories/reserva.repository');
const lookups = require('../repositories/lookups.repository');

/** Verifica que los IDs relacionados existan en sus tablas (foreign keys). */
async function verificarRelaciones(datos) {
  if (datos.sede_id !== undefined && !(await lookups.existeSede(datos.sede_id))) {
    throw new NotFoundError(`La sede con id ${datos.sede_id} no existe o está dada de baja`);
  }
  if (datos.servicio_id !== undefined && !(await lookups.existeServicio(datos.servicio_id))) {
    throw new NotFoundError(`El servicio con id ${datos.servicio_id} no existe o está dado de baja`);
  }
  if (datos.vehiculo_id !== undefined && !(await lookups.existeVehiculo(datos.vehiculo_id))) {
    throw new NotFoundError(`El vehículo con id ${datos.vehiculo_id} no existe`);
  }
}

async function listar(filtros) {
  return repo.listar(filtros);
}

async function obtenerPorId(id) {
  const reserva = await repo.obtenerPorId(id);
  if (!reserva) throw new NotFoundError(`La reserva con id ${id} no existe`);
  return reserva;
}

async function crear(body) {
  const errores = modelo.validar(body);
  if (errores.length) throw new ValidationError(errores, 'Datos de reserva inválidos');

  const datos = modelo.limpiar(body);
  await verificarRelaciones(datos);

  if (await repo.existeChoque(datos)) {
    throw new ConflictError('Ya existe una reserva en esa sede, fecha y hora');
  }

  return repo.crear(datos);
}

async function actualizar(id, body) {
  const actual = await obtenerPorId(id); // lanza NotFoundError si no existe

  const errores = modelo.validar(body, { parcial: true });
  if (errores.length) throw new ValidationError(errores, 'Datos de reserva inválidos');

  const datos = modelo.limpiar(body);
  if (Object.keys(datos).length === 0) {
    throw new BadRequestError('No se envió ningún campo para actualizar');
  }

  await verificarRelaciones(datos);

  // Para el choque se usan los valores nuevos o, si no cambian, los actuales
  const horario = {
    sede_id: datos.sede_id ?? actual.sede.id,
    fecha: datos.fecha ?? actual.fecha,
    hora: datos.hora ?? actual.hora,
  };
  if (await repo.existeChoque(horario, id)) {
    throw new ConflictError('Ya existe otra reserva en esa sede, fecha y hora');
  }

  return repo.actualizar(id, datos);
}

async function eliminar(id) {
  const eliminada = await repo.eliminar(id);
  if (!eliminada) throw new NotFoundError(`La reserva con id ${id} no existe`);
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
