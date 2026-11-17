/**
 * Servicio: Reglas de Negocio para Repuestos (Kodo Motors) — Semana 10
 * Desacoplado de HTTP. Valida inventarios, unicidad de código y bloquea la baja con stock.
 * Lanza errores tipados (NotFoundError, ConflictError, BadRequestError) que el middleware
 * central captura y responde con códigos HTTP apropiados (400, 404, 409).
 */
const repuestosRepository = require('../repositories/repuestos.repository');
const Repuesto = require('../models/repuesto.model');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../middlewares/errors/AppError');

async function listar(filtros = {}) {
  return await repuestosRepository.findAll(filtros);
}

async function obtenerPorId(id) {
  const repuesto = await repuestosRepository.findById(id);
  if (!repuesto) {
    throw new NotFoundError(`Repuesto con ID ${id} no encontrado en el inventario`);
  }
  return repuesto;
}

async function crear(datos) {
  // 1. Validar forma y campos obligatorios desde el modelo de dominio
  const errores = Repuesto.validar(datos, false);
  if (errores.length > 0) {
    throw new BadRequestError('Datos de repuesto inválidos', errores);
  }

  const codigoNormalizado = String(datos.codigo || '').trim().toUpperCase();

  // 2. Regla de negocio: El código de repuesto debe ser único (también frente a los dados de baja)
  const existente = await repuestosRepository.findByCodigo(codigoNormalizado);
  if (existente) {
    if (existente.activo) {
      throw new ConflictError(`Ya existe un repuesto registrado con el código "${codigoNormalizado}"`);
    } else {
      throw new ConflictError(
        `El código "${codigoNormalizado}" pertenece a un repuesto que fue dado de baja (ID #${existente.id}). Utilice un código diferente.`
      );
    }
  }

  // 3. Crear en base de datos
  return await repuestosRepository.create(datos);
}

async function actualizar(id, datos) {
  if (!datos || Object.keys(datos).length === 0) {
    throw new BadRequestError('Envía al menos un campo para actualizar');
  }

  const existente = await obtenerPorId(id);

  const errores = Repuesto.validar(datos, true);
  if (errores.length > 0) {
    throw new BadRequestError('Datos de actualización inválidos', errores);
  }

  // Si actualiza código, verificar que no colisione con otro
  if (datos.codigo) {
    const codigoNormalizado = datos.codigo.trim().toUpperCase();
    if (codigoNormalizado !== existente.codigo) {
      const colision = await repuestosRepository.findByCodigo(codigoNormalizado);
      if (colision && colision.id !== id) {
        throw new ConflictError(`El código "${codigoNormalizado}" ya pertenece a otro repuesto`);
      }
    }
  }

  const datosCompletos = {
    codigo: datos.codigo || existente.codigo,
    nombre: datos.nombre || existente.nombre,
    modelo_compatible: datos.modelo_compatible || existente.modeloCompatible,
    stock: datos.stock !== undefined ? datos.stock : existente.stock,
    stock_minimo: datos.stock_minimo !== undefined ? datos.stock_minimo : existente.stockMinimo,
    precio: datos.precio !== undefined ? datos.precio : existente.precio,
    ubicacion: datos.ubicacion !== undefined ? datos.ubicacion : existente.ubicacion,
  };

  return await repuestosRepository.update(id, datosCompletos);
}

async function eliminar(id) {
  const existente = await obtenerPorId(id);

  // Regla de Negocio de Almacén: No dar de baja si aún tiene stock físico (400)
  if (existente.stock > 0) {
    throw new BadRequestError(
      `No se puede dar de baja el repuesto "${existente.nombre}" porque todavía cuenta con stock disponible (${existente.stock} unidades). Ajuste el stock a 0 antes de darlo de baja.`
    );
  }

  // Borrado lógico: activo pasa a 0, la fila se conserva
  const eliminado = await repuestosRepository.remove(id);
  if (!eliminado) {
    throw new NotFoundError(`Repuesto con ID ${id} no encontrado en el inventario`);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
