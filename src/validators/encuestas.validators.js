/**
 * Validadores Express-Validator para Encuestas (Kodo Motors) — Semana 10
 * Separación de la capa de validación HTTP respecto a rutas y servicios.
 */
const { body, query } = require('express-validator');
const { textoOpcional } = require('./common');

const reglasCrearEncuesta = () => [
  body('id').not().exists().withMessage('El id no se puede enviar'),

  body('activo').not().exists().withMessage('El campo "activo" no se puede enviar; para dar de baja usa DELETE'),

  body('orden_id')
    .notEmpty()
    .withMessage('El campo "orden_id" es obligatorio y debe ser un número entero positivo')
    .bail()
    .isInt({ min: 1 })
    .withMessage('El campo "orden_id" es obligatorio y debe ser un número entero positivo')
    .toInt(),

  body('puntuacion')
    .notEmpty()
    .withMessage('El campo "puntuacion" es obligatorio y debe ser un número entero entre 1 y 5')
    .bail()
    .isInt({ min: 1, max: 5 })
    .withMessage('El campo "puntuacion" es obligatorio y debe ser un número entero entre 1 y 5')
    .toInt(),

  body('recomendaria')
    .notEmpty()
    .withMessage('El campo "recomendaria" es obligatorio (true/false o 1/0)')
    .bail()
    .isBoolean()
    .withMessage('El campo "recomendaria" debe ser un valor booleano')
    .toBoolean(),

  textoOpcional('comentario', 300),
];

const reglasActualizarEncuesta = () => [
  body('id').not().exists().withMessage('El id no se puede enviar'),

  body('activo').not().exists().withMessage('El campo "activo" no se puede enviar; para dar de baja usa DELETE'),

  body('orden_id')
    .not()
    .exists()
    .withMessage('El campo "orden_id" no se puede modificar una vez creada la encuesta'),

  body('puntuacion')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('El campo "puntuacion" debe ser un número entero entre 1 y 5')
    .toInt(),

  body('recomendaria')
    .optional()
    .isBoolean()
    .withMessage('El campo "recomendaria" debe ser un valor booleano')
    .toBoolean(),

  textoOpcional('comentario', 300),
];

const reglasFiltrosEncuestas = () => [
  query('puntuacion')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('El filtro puntuacion debe ser un número entero entre 1 y 5'),

  query('recomendaria')
    .optional()
    .isIn(['true', 'false', '1', '0'])
    .withMessage('El filtro recomendaria debe ser booleano (true o false)'),

  query('incluir_inactivos')
    .optional()
    .isIn(['true', 'false', '1', '0'])
    .withMessage('El filtro incluir_inactivos debe ser booleano (true o false)'),
];

module.exports = {
  reglasCrearEncuesta,
  reglasActualizarEncuesta,
  reglasFiltrosEncuestas,
};
