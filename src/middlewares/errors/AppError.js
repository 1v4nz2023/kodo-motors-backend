/**
 * Clases de error propias para Kodo Motors — Semana 10
 * Cada clase encapsula su código HTTP y tipo de error semántico.
 * Hereda de Error y es compatible con el contrato de HttpError.
 */

class HttpError extends Error {
  constructor(status, mensaje, errores, tipo) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = Number(status) || 500;
    this.estado = this.status;
    this.errores = errores;
    this.detalle = errores;

    if (tipo) {
      this.tipo = tipo;
    } else {
      switch (this.status) {
        case 400:
          this.tipo = errores && Array.isArray(errores) ? 'VALIDACION' : 'SOLICITUD_INVALIDA';
          break;
        case 401:
          this.tipo = 'NO_AUTENTICADO';
          break;
        case 403:
          this.tipo = 'SIN_PERMISO';
          break;
        case 404:
          this.tipo = 'NO_ENCONTRADO';
          break;
        case 409:
          this.tipo = 'CONFLICTO';
          break;
        case 413:
          this.tipo = 'CUERPO_MUY_GRANDE';
          break;
        default:
          this.tipo = 'ERROR_GENERAL';
          break;
      }
    }
  }
}

class AppError extends HttpError {
  constructor(estado, tipo, mensaje, detalle) {
    super(estado, mensaje, detalle, tipo);
    this.name = 'AppError';
  }
}

class BadRequestError extends AppError {
  constructor(mensaje = 'Solicitud inválida', detalle) {
    super(400, 'SOLICITUD_INVALIDA', mensaje, detalle);
    this.name = 'BadRequestError';
  }
}

class ValidationError extends AppError {
  constructor(detalle = []) {
    super(400, 'VALIDACION', 'Datos inválidos', detalle);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends AppError {
  constructor(mensaje = 'Falta o es inválida la llave de acceso') {
    super(401, 'NO_AUTENTICADO', mensaje);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(mensaje = 'No cuentas con los permisos requeridos') {
    super(403, 'SIN_PERMISO', mensaje);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(mensaje = 'Recurso no encontrado') {
    super(404, 'NO_ENCONTRADO', mensaje);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(mensaje = 'Conflicto con el estado actual del recurso') {
    super(409, 'CONFLICTO', mensaje);
    this.name = 'ConflictError';
  }
}

module.exports = {
  HttpError,
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
