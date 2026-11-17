/**
 * Servicio: Reglas de Negocio para Repuestos (Kodo Motors)
 * Desacoplado de HTTP. Valida inventarios, unicidad de código y bloquea la baja con stock.
 * El id ya llega validado por el middleware validarId.
 */
const repuestosRepository = require('../repositories/repuestos.repository');
const Repuesto = require('../models/repuesto.model');
const HttpError = require('../utils/http-error');
const { revisarCamposPermitidos } = require('../utils/validaciones');

const CAMPOS_PERMITIDOS = [
  'codigo', 'nombre', 'modelo_compatible', 'stock', 'stock_minimo', 'precio', 'ubicacion',
];

async function listar(filtros = {}) {
  return await repuestosRepository.findAll(filtros);
}

async function obtenerPorId(id) {
  const repuesto = await repuestosRepository.findById(id);
  if (!repuesto) {
    throw new HttpError(404, `Repuesto con ID ${id} no encontrado en el inventario`);
  }
  return repuesto;
}

async function crear(datos) {
  // 1. Validar forma y campos obligatorios
  revisarCamposPermitidos(datos, CAMPOS_PERMITIDOS);
  const errores = Repuesto.validar(datos, false);
  if (errores.length > 0) {
    throw new HttpError(400, 'Datos de repuesto inválidos', errores);
  }

  // 2. Regla de negocio: El código de repuesto debe ser único (también frente a los dados de baja)
  const existente = await repuestosRepository.findByCodigo(datos.codigo);
  if (existente) {
    if (existente.activo) {
      throw new HttpError(409, `Ya existe un repuesto registrado con el código "${datos.codigo.trim().toUpperCase()}"`);
    } else {
      throw new HttpError(409, `El código "${datos.codigo.trim().toUpperCase()}" pertenece a un repuesto que fue dado de baja (ID #${existente.id}). Utilice un código diferente.`);
    }
  }

  // 3. Crear en base de datos
  return await repuestosRepository.create(datos);
}

async function actualizar(id, datos) {
  revisarCamposPermitidos(datos, CAMPOS_PERMITIDOS);
  if (Object.keys(datos).length === 0) {
    throw new HttpError(400, 'Envía al menos un campo para actualizar');
  }

  const errores = Repuesto.validar(datos, true);
  if (errores.length > 0) {
    throw new HttpError(400, 'Datos de actualización inválidos', errores);
  }

  const existente = await obtenerPorId(id);

  // Si actualiza código, verificar que no colisione con otro
  if (datos.codigo && datos.codigo.trim().toUpperCase() !== existente.codigo) {
    const colision = await repuestosRepository.findByCodigo(datos.codigo);
    if (colision && colision.id !== id) {
      throw new HttpError(409, `El código "${datos.codigo.trim().toUpperCase()}" ya pertenece a otro repuesto`);
    }
  }

  const datosCompletos = {
    codigo: datos.codigo || existente.codigo,
    nombre: datos.nombre || existente.nombre,
    modelo_compatible: datos.modelo_compatible || existente.modeloCompatible,
    stock: datos.stock !== undefined ? datos.stock : existente.stock,
    stock_minimo: datos.stock_minimo !== undefined ? datos.stock_minimo : existente.stockMinimo,
    precio: datos.precio !== undefined ? datos.precio : existente.precio,
    ubicacion: datos.ubicacion !== undefined ? datos.ubicacion : existente.ubicacion
  };

  return await repuestosRepository.update(id, datosCompletos);
}

async function eliminar(id) {
  const existente = await obtenerPorId(id);

  // Regla de Negocio de Almacén: No dar de baja si aún tiene stock físico
  if (existente.stock > 0) {
    throw new HttpError(
      400,
      `No se puede dar de baja el repuesto "${existente.nombre}" porque todavía cuenta con stock disponible (${existente.stock} unidades). Ajuste el stock a 0 antes de darlo de baja.`
    );
  }

  // Borrado lógico: activo pasa a 0, la fila se conserva
  await repuestosRepository.remove(id);
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
