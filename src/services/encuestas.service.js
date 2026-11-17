/**
 * Servicio: Reglas de Negocio para Encuestas de Satisfacción (Kodo Motors) — Semana 10
 * Valida estado de la orden de servicio ('entregado'), existencia de orden e impide duplicados.
 * Lanza errores semánticos (NotFoundError, ConflictError, BadRequestError) procesados centralmente.
 */
const encuestasRepository = require('../repositories/encuestas.repository');
const Encuesta = require('../models/encuesta.model');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../middlewares/errors/AppError');

async function listar(filtros = {}) {
  return await encuestasRepository.findAll(filtros);
}

async function obtenerPorId(id) {
  const encuesta = await encuestasRepository.findById(id);
  if (!encuesta) {
    throw new NotFoundError(`Encuesta con ID ${id} no encontrada`);
  }
  return encuesta;
}

async function crear(datos) {
  // 1. Validar forma del dato (puntuación de 1 a 5, recomendaria booleano)
  const errores = Encuesta.validar(datos, false);
  if (errores.length > 0) {
    throw new BadRequestError('Datos de encuesta inválidos', errores);
  }

  const ordenId = Number(datos.orden_id);

  // 2. Regla de Negocio: La orden de servicio debe existir (404)
  const orden = await encuestasRepository.findOrdenServicioById(ordenId);
  if (!orden) {
    throw new NotFoundError(
      `No se puede registrar la encuesta: La orden de servicio #${ordenId} no existe`
    );
  }

  // 3. Regla de Negocio Crítica: Solo se encuesta si el servicio ya fue ENTREGADO al cliente (400)
  const estadoNormalizado = String(orden.estado || '').toLowerCase().trim();
  if (estadoNormalizado !== 'entregado') {
    throw new BadRequestError(
      `No se puede encuestar la orden #${ordenId} porque su estado es "${orden.estado}". Solo se admiten encuestas para órdenes con estado "entregado".`
    );
  }

  // 4. Regla de Negocio: Cada orden de servicio solo puede tener una única encuesta (409)
  const encuestaExistente = await encuestasRepository.findByOrdenId(ordenId);
  if (encuestaExistente) {
    if (encuestaExistente.activo) {
      throw new ConflictError(
        `La orden de servicio #${ordenId} ya cuenta con una encuesta de satisfacción registrada (ID: ${encuestaExistente.id})`
      );
    } else {
      throw new ConflictError(
        `La orden de servicio #${ordenId} ya tiene una encuesta registrada que fue dada de baja (ID: ${encuestaExistente.id}). Por integridad, no se admiten múltiples encuestas para la misma orden.`
      );
    }
  }

  return await encuestasRepository.create(datos);
}

async function actualizar(id, datos) {
  if (!datos || Object.keys(datos).length === 0) {
    throw new BadRequestError('Envía al menos un campo para actualizar');
  }

  const existente = await obtenerPorId(id);

  const errores = Encuesta.validar(datos, true);
  if (errores.length > 0) {
    throw new BadRequestError('Datos de actualización de encuesta inválidos', errores);
  }

  const datosCompletos = {
    puntuacion: datos.puntuacion !== undefined ? datos.puntuacion : existente.puntuacion,
    recomendaria: datos.recomendaria !== undefined ? datos.recomendaria : existente.recomendaria,
    comentario: datos.comentario !== undefined ? datos.comentario : existente.comentario,
  };

  return await encuestasRepository.update(id, datosCompletos);
}

async function eliminar(id) {
  await obtenerPorId(id);

  // Borrado lógico: activo pasa a 0, la fila se conserva
  const eliminado = await encuestasRepository.remove(id);
  if (!eliminado) {
    throw new NotFoundError(`Encuesta con ID ${id} no encontrada`);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
