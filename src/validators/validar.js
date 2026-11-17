// Middleware que cierra la cadena de reglas: delega al handler central con ValidationError (Semana 10, Slide 27)
const { validationResult } = require('express-validator');
const { ValidationError } = require('../middlewares/errors/AppError');

module.exports = (req, res, next) => {
  const resultado = validationResult(req).formatWith((e) => ({
    campo: e.path,
    mensaje: e.msg,
  }));

  if (resultado.isEmpty()) return next();

  return next(new ValidationError(resultado.array({ onlyFirstError: true })));
};
