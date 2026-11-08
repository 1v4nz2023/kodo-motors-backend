// Error con código HTTP: compatible con la jerarquía de AppError (Semana 10)
const {
  HttpError,
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../middlewares/errors/AppError');

module.exports = HttpError;
module.exports.AppError = AppError;
module.exports.HttpError = HttpError;
module.exports.BadRequestError = BadRequestError;
module.exports.ValidationError = ValidationError;
module.exports.UnauthorizedError = UnauthorizedError;
module.exports.ForbiddenError = ForbiddenError;
module.exports.NotFoundError = NotFoundError;
module.exports.ConflictError = ConflictError;
