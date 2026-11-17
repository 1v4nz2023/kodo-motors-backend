// Autenticación y autorización de la API (Semana 10, Slide 28)
//   401 → falta la credencial o no es válida      403 → hay credencial, pero el rol no alcanza
// La llave vive SOLO en el .env (API_KEY). No hay valor por defecto en el código: si un valor
// de respaldo quedara escrito aquí, cualquiera que lea el repositorio podría entrar a la API.
const { timingSafeEqual } = require('crypto');
const { UnauthorizedError, ForbiddenError } = require('./errors/AppError');

// Compara sin revelar por tiempo de respuesta cuántos caracteres coinciden
function mismaLlave(recibida, esperada) {
  const a = Buffer.from(String(recibida));
  const b = Buffer.from(String(esperada));
  return a.length === b.length && timingSafeEqual(a, b);
}

const autenticar = (req, res, next) => {
  const llave = req.header('x-api-key');
  if (!llave) return next(new UnauthorizedError('Falta x-api-key'));

  // Se lee en cada petición: así las pruebas y el .env mandan, no un valor fijo
  const esperada = process.env.API_KEY;
  if (!esperada || !mismaLlave(llave, esperada)) {
    return next(new UnauthorizedError('Llave inválida'));
  }
  next();
};

// El rol llega en la cabecera x-rol. Es una simulación didáctica: el rol firmado (JWT) es de la Semana 14
const autorizar = (...roles) => (req, res, next) =>
  roles.includes(req.header('x-rol'))
    ? next()
    : next(new ForbiddenError(`Requiere rol: ${roles.join(' o ')}`));

module.exports = {
  autenticar,
  autorizar,
};
