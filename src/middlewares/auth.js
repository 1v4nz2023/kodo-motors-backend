// Middleware didáctico de autenticación y autorización (Semana 10, Slide 28)
// Practica los códigos 401 (sin credenciales / inválida) y 403 (sin permisos suficientes)
const { UnauthorizedError, ForbiddenError } = require('./errors/AppError');

const API_KEY_DEFAULT = process.env.API_KEY || 'kodo-api-key-2026';

const autenticar = (req, res, next) => {
  const llave = req.header('x-api-key');
  if (!llave) return next(new UnauthorizedError('Falta x-api-key'));
  if (llave !== API_KEY_DEFAULT) return next(new UnauthorizedError('Llave inválida'));
  next();
};

const autorizar = (...roles) => (req, res, next) =>
  roles.includes(req.header('x-rol'))
    ? next()
    : next(new ForbiddenError(`Requiere rol: ${roles.join(' o ')}`));

module.exports = {
  autenticar,
  autorizar,
};
