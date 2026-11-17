const { body, query } = require('express-validator');
const { campo, enteroPositivo, esTextoONumero, textoOpcional } = require('./common');

const CAMPOS_ACTUALIZABLES = ['puntuacion', 'recomendaria', 'comentario'];

const esBooleanoOValor = (valor) =>
  typeof valor === 'boolean' || esTextoONumero(valor);

// parcial = true en PUT: solo se validan los campos enviados.
const reglasEncuesta = (parcial = false) => [
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

  // La orden de una encuesta no se cambia: en PUT se rechaza; en POST es obligatoria.
  ...(parcial
    ? [body('orden_id').not().exists().withMessage('El orden_id no se puede modificar')]
    : [enteroPositivo('orden_id', false)]),

  campo('puntuacion', parcial)
    .notEmpty().withMessage('La puntuación es obligatoria').bail()
    .custom(esTextoONumero).withMessage('La puntuación debe ser un número entero').bail()
    .isInt({ min: 1, max: 5 }).withMessage('La puntuación debe ser un entero entre 1 y 5').bail()
    .toInt(),

  campo('recomendaria', parcial)
    .notEmpty().withMessage('El campo recomendaria es obligatorio').bail()
    .custom(esBooleanoOValor).withMessage('recomendaria debe ser true o false').bail()
    .isBoolean().withMessage('recomendaria debe ser true o false').bail()
    .toBoolean(),

  textoOpcional('comentario', 300),
];

// Un parámetro repetido llega como arreglo: isString lo rechaza.
const reglasFiltrosEncuesta = () => [
  query('puntuacion').optional()
    .isString().withMessage('El filtro puntuacion debe ser un solo valor').bail()
    .isInt({ min: 1, max: 5 }).withMessage('El filtro puntuacion debe ser un entero entre 1 y 5'),

  query('recomendaria').optional()
    .isString().withMessage('El filtro recomendaria debe ser un solo valor').bail()
    .isIn(['true', 'false', '1', '0']).withMessage('El filtro recomendaria debe ser true, false, 1 o 0'),
];

// Alias con los nombres de la semana 10: el comportamiento es el mismo.
module.exports = {
  reglasEncuesta,
  reglasFiltrosEncuesta,
  reglasCrearEncuesta: () => reglasEncuesta(false),
  reglasActualizarEncuesta: () => reglasEncuesta(true),
  reglasFiltrosEncuestas: reglasFiltrosEncuesta,
};
