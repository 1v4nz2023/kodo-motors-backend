// Middleware de ruta: verifica que :id sea un entero positivo antes de llegar al controlador
const { BadRequestError } = require('./errors/AppError');

function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return next(new BadRequestError('El id debe ser un número entero positivo'));
  }
  next();
}

module.exports = validarId;
