// Middleware de validación con express-validator (Semana 10, Slide 27)
// Delega al handler central pasando una instancia de ValidationError
const { validationResult } = require('express-validator');
const { ValidationError } = require('../middlewares/errors/AppError');

module.exports = (req, res, next) => {
  const r = validationResult(req).formatWith((e) => ({ campo: e.path, mensaje: e.msg }));
  if (r.isEmpty()) return next();
  return next(new ValidationError(r.array({ onlyFirstError: true })));
};
