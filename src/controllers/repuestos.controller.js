/**
 * Controlador: Gestión HTTP de Repuestos (Kodo Motors)
 * Maneja req/res y responde con JSON y códigos HTTP; los errores van a next()
 * y los responde el middleware manejarErrores.
 */
const { matchedData } = require('express-validator');
const repuestosService = require('../services/repuestos.service');

async function listar(req, res, next) {
  try {
    const filtros = {
      modelo_compatible: req.query.modelo_compatible,
      bajo_stock: req.query.bajo_stock,
      incluir_inactivos: req.query.incluir_inactivos
    };
    const repuestos = await repuestosService.listar(filtros);
    res.status(200).json(repuestos);
  } catch (error) {
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const repuesto = await repuestosService.obtenerPorId(Number(req.params.id));
    res.status(200).json(repuesto);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const datos = matchedData(req, { locations: ['body'], includeOptionals: true });
    const nuevo = await repuestosService.crear(datos);
    res.status(201).json(nuevo);
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const datos = matchedData(req, { locations: ['body'], includeOptionals: true });
    const actualizado = await repuestosService.actualizar(Number(req.params.id), datos);
    res.status(200).json(actualizado);
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    await repuestosService.eliminar(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
