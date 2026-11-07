// Clases de error propias según la Semana 10 (Slide 23)
// Cada clase conoce su código HTTP y su tipo semántico para el contrato del cliente.

const MAPA_TIPOS = {
  400: 'SOLICITUD_INVALIDA',
  401: 'NO_AUTENTICADO',
  403: 'SIN_PERMISO',
  404: 'NO_ENCONTRADO',
  409: 'CONFLICTO',
  413: 'CUERPO_MUY_GRANDE',
  500: 'ERROR_INTERNO',
};

class AppError extends Error {
  constructor(estado, tipo, mensaje, detalle) {
    super(mensaje);
    this.name = this.constructor.name;
    this.estado = estado; // 404
    this.tipo = tipo; // 'NO_ENCONTRADO'
    this.detalle = detalle; // errores[] (opcional)

    // Atributos compatibles con HttpError (pruebas anteriores de Semana 9 / EE2)
    this.status = estado;
    this.errores = detalle;
  }
}

class HttpError extends AppError {
  constructor(status, mensaje, errores) {
    const tipo = (Array.isArray(errores) && errores.length > 0)
      ? 'VALIDACION'
      : (MAPA_TIPOS[status] || 'ERROR');
    super(status, tipo, mensaje, errores);
    this.name = 'HttpError';
  }
}

class BadRequestError extends HttpError {
  constructor(m = 'Solicitud inválida', detalle) {
    super(400, m, detalle);
    this.name = 'BadRequestError';
    this.tipo = 'SOLICITUD_INVALIDA';
  }
}

class ValidationError extends HttpError {
  constructor(detalleOrMensaje, mensajeOrDetalle = 'Datos inválidos') {
    let detalle;
    let mensaje;
    if (Array.isArray(detalleOrMensaje)) {
      detalle = detalleOrMensaje;
      mensaje = typeof mensajeOrDetalle === 'string' ? mensajeOrDetalle : 'Datos inválidos';
    } else if (typeof detalleOrMensaje === 'string') {
      mensaje = detalleOrMensaje;
      detalle = Array.isArray(mensajeOrDetalle) ? mensajeOrDetalle : undefined;
    } else {
      detalle = detalleOrMensaje;
      mensaje = 'Datos inválidos';
    }
    super(400, mensaje, detalle);
    this.name = 'ValidationError';
    this.tipo = 'VALIDACION';
  }
}

class UnauthorizedError extends HttpError {
  constructor(m = 'Falta o es inválida la credencial') {
    super(401, m);
    this.name = 'UnauthorizedError';
    this.tipo = 'NO_AUTENTICADO';
  }
}

class ForbiddenError extends HttpError {
  constructor(m = 'Sin permiso') {
    super(403, m);
    this.name = 'ForbiddenError';
    this.tipo = 'SIN_PERMISO';
  }
}

class NotFoundError extends HttpError {
  constructor(m = 'Recurso no encontrado') {
    super(404, m);
    this.name = 'NotFoundError';
    this.tipo = 'NO_ENCONTRADO';
  }
}

class ConflictError extends HttpError {
  constructor(m = 'Conflicto') {
    super(409, m);
    this.name = 'ConflictError';
    this.tipo = 'CONFLICTO';
  }
}

module.exports = {
  AppError,
  HttpError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  MAPA_TIPOS,
};
