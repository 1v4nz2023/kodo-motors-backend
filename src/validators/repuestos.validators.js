/**
 * Validadores Express-Validator para Repuestos (Kodo Motors) — Semana 10
 * Separación de la capa de validación HTTP respecto a rutas y servicios.
 */
const { body, query } = require('express-validator');
const Repuesto = require('../models/repuesto.model');
const { campo, textoOpcional } = require('./common');

const PRECIO_MAXIMO = 999999.99;

const reglasRepuesto = (parcial = false) => [
  body('id').not().exists().withMessage('El id no se puede enviar'),

  body('activo').not().exists().withMessage('El campo "activo" no se puede enviar; para dar de baja usa DELETE'),

  campo('codigo', parcial)
    .notEmpty({ ignore_whitespace: true })
    .withMessage('El campo "codigo" es obligatorio y debe tener al menos 3 caracteres')
    .bail()
    .isString()
    .withMessage('El campo "codigo" es obligatorio y debe tener al menos 3 caracteres')
    .bail()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('El campo "codigo" es obligatorio y debe tener al menos 3 caracteres')
    .customSanitizer((v) => (v ? v.toUpperCase() : v)),

  campo('nombre', parcial)
    .notEmpty({ ignore_whitespace: true })
    .withMessage('El campo "nombre" es obligatorio y no puede estar vacío')
    .bail()
    .isString()
    .withMessage('El campo "nombre" debe ser texto')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El campo "nombre" debe tener entre 2 y 100 caracteres')
    .customSanitizer((v) => (v ? v.replace(/\s+/g, ' ') : v)),

  campo('modelo_compatible', parcial)
    .notEmpty({ ignore_whitespace: true })
    .withMessage('El campo "modelo_compatible" es obligatorio')
    .bail()
    .isIn(Repuesto.MODELOS_PERMITIDOS)
    .withMessage(`El campo "modelo_compatible" debe ser uno de: ${Repuesto.MODELOS_PERMITIDOS.join(', ')}`),

  campo('precio', parcial)
    .notEmpty()
    .withMessage('El campo "precio" es obligatorio y debe ser un número mayor a 0')
    .bail()
    .isFloat({ gt: 0, max: PRECIO_MAXIMO })
    .withMessage('El campo "precio" es obligatorio y debe ser un número mayor a 0')
    .toFloat(),

  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El campo "stock" debe ser un número entero mayor o igual a 0')
    .toInt(),

  body('stock_minimo')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El campo "stock_minimo" debe ser un número entero mayor o igual a 0')
    .toInt(),

  textoOpcional('ubicacion', 50),
];

const reglasFiltrosRepuestos = () => [
  query('modelo_compatible')
    .optional()
    .isIn(Repuesto.MODELOS_PERMITIDOS)
    .withMessage(`El filtro modelo_compatible debe ser uno de: ${Repuesto.MODELOS_PERMITIDOS.join(', ')}`),

  query('bajo_stock')
    .optional()
    .isIn(['true', 'false', '1', '0'])
    .withMessage('El filtro bajo_stock debe ser booleano (true o false)'),

  query('incluir_inactivos')
    .optional()
    .isIn(['true', 'false', '1', '0'])
    .withMessage('El filtro incluir_inactivos debe ser booleano (true o false)'),
];

module.exports = {
  reglasRepuesto,
  reglasFiltrosRepuestos,
};
