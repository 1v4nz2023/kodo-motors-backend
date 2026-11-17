/**
 * Controlador: Gestión HTTP de Encuestas de Satisfacción (Kodo Motors)
 * Maneja req/res y responde con JSON y códigos HTTP; los errores van a next()
 * y los responde el middleware manejarErrores.
 */
const { matchedData } = require('express-validator');
const encuestasService = require('../services/encuestas.service');

async function listar(req, res, next) {
  try {
    const filtros = {
      puntuacion: req.query.puntuacion,
      recomendaria: req.query.recomendaria,
      incluir_inactivos: req.query.incluir_inactivos
    };
    const encuestas = await encuestasService.listar(filtros);
    res.status(200).json(encuestas);
  } catch (error) {
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const encuesta = await encuestasService.obtenerPorId(Number(req.params.id));
    res.status(200).json(encuesta);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const datos = matchedData(req, { locations: ['body'], includeOptionals: true });
    const nueva = await encuestasService.crear(datos);
    res.status(201).json(nueva);
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const datos = matchedData(req, { locations: ['body'], includeOptionals: true });
    const actualizada = await encuestasService.actualizar(Number(req.params.id), datos);
    res.status(200).json(actualizada);
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    await encuestasService.eliminar(Number(req.params.id));
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
