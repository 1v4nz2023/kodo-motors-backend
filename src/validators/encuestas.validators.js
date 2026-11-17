const { body } = require('express-validator');
const { campo, enteroPositivo, textoOpcional, esTextoONumero } = require('./common');

const reglasEncuesta = (parcial = false) => {
  const reglasOrden = parcial
    ? body('orden_id').not().exists().withMessage('orden_id no se puede modificar')
    : enteroPositivo('orden_id');

  return [
    body('id').not().exists().withMessage('El id no se puede enviar'),
    reglasOrden,

    campo('puntuacion', parcial)
      .notEmpty().withMessage('La puntuación es obligatoria').bail()
      .custom(esTextoONumero).withMessage('La puntuación debe ser un número entero').bail()
      .isInt({ min: 1, max: 5 }).withMessage('La puntuación debe ser un entero entre 1 y 5')
      .toInt(),

    campo('recomendaria', parcial)
      .notEmpty().withMessage('recomendaria es obligatorio').bail()
      .custom((valor) => typeof valor === 'boolean' || valor === 0 || valor === 1)
      .withMessage('recomendaria debe ser true, false, 1 o 0'),

    textoOpcional('comentario', 300),
    body('activo').not().exists().withMessage('Activo no se puede enviar; para dar de baja usa DELETE'),
  ];
};

module.exports = { reglasEncuesta };
