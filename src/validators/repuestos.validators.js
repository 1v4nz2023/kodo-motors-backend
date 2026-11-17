const { body } = require('express-validator');
const { MODELOS_PERMITIDOS, PRECIO_MAXIMO } = require('../models/repuesto.model');
const { campo, esTextoONumero, textoObligatorio, textoOpcional } = require('./common');

const FORMATO_CODIGO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const reglasRepuesto = (parcial = false) => [
  body('id').not().exists().withMessage('El id no se puede enviar'),

  textoObligatorio('codigo', 'El código es obligatorio', parcial)
    .isLength({ min: 3, max: 20 }).withMessage('El código debe tener entre 3 y 20 caracteres')
    .matches(FORMATO_CODIGO).withMessage('El código solo admite letras, números, punto, guion y guion bajo')
    .customSanitizer((valor) => valor.toUpperCase()),

  textoObligatorio('nombre', 'El nombre es obligatorio', parcial)
    .isLength({ min: 1, max: 100 }).withMessage('El nombre admite máximo 100 caracteres'),

  campo('modelo_compatible', parcial)
    .notEmpty().withMessage('El modelo compatible es obligatorio').bail()
    .isString().withMessage('El modelo compatible debe ser texto').bail()
    .isIn(MODELOS_PERMITIDOS).withMessage(`El modelo compatible debe ser uno de: ${MODELOS_PERMITIDOS.join(', ')}`),

  body('stock').optional()
    .custom(esTextoONumero).withMessage('El stock debe ser un número entero').bail()
    .isInt({ min: 0 }).withMessage('El stock debe ser un entero mayor o igual a 0')
    .toInt(),

  body('stock_minimo').optional()
    .custom(esTextoONumero).withMessage('El stock mínimo debe ser un número entero').bail()
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un entero mayor o igual a 0')
    .toInt(),

  campo('precio', parcial)
    .notEmpty().withMessage('El precio es obligatorio').bail()
    .custom(esTextoONumero).withMessage('El precio debe ser un número').bail()
    .isDecimal({ decimal_digits: '0,2' }).withMessage('El precio debe tener máximo 2 decimales').bail()
    .custom((valor) => Number(valor) > 0 && Number(valor) <= PRECIO_MAXIMO)
    .withMessage(`El precio debe ser mayor a 0 y máximo ${PRECIO_MAXIMO}`)
    .toFloat(),

  textoOpcional('ubicacion', 20),
  body('activo').not().exists().withMessage('Activo no se puede enviar; para dar de baja usa DELETE'),
];

module.exports = { reglasRepuesto };
