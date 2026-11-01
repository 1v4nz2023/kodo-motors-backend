// Middleware que cierra la cadena de reglas: si hay errores responde 400 y el controlador NUNCA se ejecuta.
const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const resultado = validationResult(req).formatWith((e) => ({ campo: e.path, mensaje: e.msg }));
  if (resultado.isEmpty()) return next();
  return res.status(400).json({
    mensaje: 'Datos inválidos',
    errores: resultado.array({ onlyFirstError: true }), // un solo mensaje por campo
  });
};