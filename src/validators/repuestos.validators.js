const { body, query } = require('express-validator');
const { MODELOS_PERMITIDOS } = require('../models/repuesto.model');
const {
  ENTERO_MAXIMO,
  campo,
  esTextoONumero,
  textoObligatorio,
  textoOpcional,
} = require('./common');

const FORMATO_CODIGO = /^[A-Z0-9-]+$/;
const FORMATO_NOMBRE = /^[\p{L}\d][\p{L}\d .,'’()/-]*$/u;
const PRECIO_MAXIMO = 999999.99; // límite DECIMAL(8,2)
const CAMPOS_ACTUALIZABLES = ['codigo', 'nombre', 'modelo_compatible', 'precio', 'stock', 'stock_minimo', 'ubicacion'];

// parcial = true en PUT: solo se validan los campos enviados.
const reglasRepuesto = (parcial = false) => [
  body('id').not().exists().withMessage('El id no se puede enviar'),
  body('activo').not().exists().withMessage('Activo no se puede enviar; para dar de baja usa DELETE'),

  ...(parcial
    ? [
        body().custom((valor) => {
          if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
            throw new Error('El cuerpo de la solicitud debe ser un objeto JSON');
          }
          if (valor.id !== undefined || valor.activo !== undefined) return true;
          const tieneCambios = CAMPOS_ACTUALIZABLES.some((c) => valor[c] !== undefined);
          if (!tieneCambios) {
            throw new Error('Envía al menos un campo válido para actualizar');
          }
          return true;
        }),
      ]
    : []),

  textoObligatorio('codigo', 'El código es obligatorio', parcial)
    .toUpperCase()
    .isLength({ min: 3, max: 20 }).withMessage('El código debe tener entre 3 y 20 caracteres').bail()
    .matches(FORMATO_CODIGO).withMessage('El código solo admite letras, números y guiones (-)'),

  textoObligatorio('nombre', 'El nombre es obligatorio', parcial)
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres').bail()
    .matches(FORMATO_NOMBRE).withMessage('El nombre solo admite letras, números y . , \' - ( ) /'),

  campo('modelo_compatible', parcial)
    .notEmpty({ ignore_whitespace: true }).withMessage('El modelo compatible es obligatorio').bail()
    .isString().withMessage('El modelo compatible debe ser texto').bail()
    .trim()
    .isIn(MODELOS_PERMITIDOS).withMessage(`El modelo compatible debe ser uno de: ${MODELOS_PERMITIDOS.join(', ')}`),

  campo('precio', parcial)
    .notEmpty().withMessage('El precio es obligatorio').bail()
    .custom(esTextoONumero).withMessage('El precio debe ser un número').bail()
    .isDecimal({ decimal_digits: '0,2' }).withMessage('El precio debe ser un número con máximo 2 decimales').bail()
    .custom((valor) => Number(valor) > 0 && Number(valor) <= PRECIO_MAXIMO)
    .withMessage(`El precio debe ser mayor a 0 y máximo ${PRECIO_MAXIMO}`).bail()
    .toFloat(),

  body('stock').optional()
    .custom(esTextoONumero).withMessage('El stock debe ser un número entero').bail()
    .isInt({ min: 0, max: ENTERO_MAXIMO }).withMessage('El stock debe ser un entero mayor o igual a 0').bail()
    .toInt(),

  body('stock_minimo').optional()
    .custom(esTextoONumero).withMessage('El stock mínimo debe ser un número entero').bail()
    .isInt({ min: 0, max: ENTERO_MAXIMO }).withMessage('El stock mínimo debe ser un entero mayor o igual a 0').bail()
    .toInt(),

  textoOpcional('ubicacion', 20),
];

// Un parámetro repetido llega como arreglo: isString lo rechaza.
const reglasFiltrosRepuesto = () => [
  query('modelo_compatible').optional()
    .isString().withMessage('El filtro modelo_compatible debe ser un solo valor').bail()
    .isIn(MODELOS_PERMITIDOS).withMessage(`El modelo compatible debe ser uno de: ${MODELOS_PERMITIDOS.join(', ')}`),

  query('bajo_stock').optional()
    .isString().withMessage('El filtro bajo_stock debe ser un solo valor').bail()
    .isIn(['true', 'false', '1', '0']).withMessage('bajo_stock debe ser true, false, 1 o 0'),
];

module.exports = { reglasRepuesto, reglasFiltrosRepuesto };
