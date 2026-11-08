// Manejo central de errores de acuerdo con la Semana 10 (Slides 20, 25, 26, 32, 33)
// Garantiza un contrato único JSON para errores: estado, tipo, mensaje, idTraza, ruta y errores (si aplica)
const {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  MAPA_TIPOS,
} = require('./errors/AppError');
const HttpError = require('../utils/http-error');

const ERRORES_DE_CONEXION = [
  'ECONNREFUSED',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'PROTOCOL_CONNECTION_LOST',
];

function rutaNoEncontrada(req, res, next) {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Traduce cualquier error interno o de librería al modelo estándar de AppError (Slide 25)
function traducir(err) {
  if (err instanceof AppError) return err;

  if (err instanceof HttpError) {
    const tipo = (Array.isArray(err.errores) && err.errores.length > 0)
      ? 'VALIDACION'
      : (MAPA_TIPOS[err.status] || 'ERROR');
    return new AppError(err.status, tipo, err.message, err.errores);
  }

  // JSON roto (Slide 25)
  if (err.type === 'entity.parse.failed') {
    return new BadRequestError('El cuerpo no es un JSON válido', [
      { campo: 'cuerpo', mensaje: 'Revisa comillas y comas.' },
    ]);
  }

  // Payload > 10KB (Slide 25)
  if (err.type === 'entity.too.large') {
    return new AppError(413, 'CUERPO_MUY_GRANDE', 'Cuerpo demasiado grande');
  }

  // MySQL UNIQUE duplicate (Slide 25)
  if (err.code === 'ER_DUP_ENTRY') {
    return new ConflictError('Ya existe un registro con esos datos');
  }

  // MySQL Foreign Key missing (Slide 25)
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return new BadRequestError('Uno de los registros relacionados no existe');
  }

  // Triggers de negocio (SIGNAL SQLSTATE '45000')
  if (err.code === 'ER_SIGNAL_EXCEPTION') {
    return new BadRequestError(err.sqlMessage || 'Operación inválida');
  }

  // Caída de la base de datos (Slide 5, 25)
  if (ERRORES_DE_CONEXION.includes(err.code)) {
    console.error('[BD]', err.code, err.message);
    return new AppError(
      503,
      'SERVICIO_NO_DISPONIBLE',
      'No hay conexión con la base de datos. Revisa que Docker esté levantado'
    );
  }

  return null; // Error inesperado (500)
}

// Handler central con 4 parámetros obligatorio (Slide 20, 26, 32)
// eslint-disable-next-line no-unused-vars
function manejarErrores(error, req, res, next) {
  const conocido = traducir(error);
  const idTraza = req?.idTraza || 'traza-manual';
  const ruta = (req?.method && req?.originalUrl)
    ? `${req.method} ${req.originalUrl}`
    : (req?.originalUrl || req?.url || 'GET /');

  if (conocido) {
    const cuerpo = {
      estado: conocido.estado,
      tipo: conocido.tipo,
      mensaje: conocido.message,
      idTraza,
      ruta,
    };
    if (conocido.detalle) {
      cuerpo.errores = conocido.detalle;
    }
    return res.status(conocido.estado).json(cuerpo);
  }

  // Inesperado: registro seguro en log sin exponer detalles al cliente (Slide 26, 32)
  console.error(`[${idTraza}]`, ruta, error);

  const cuerpo = {
    estado: 500,
    tipo: 'ERROR_INTERNO',
    mensaje: 'Error interno del servidor',
    idTraza,
    ruta,
  };

  // Solo en desarrollo y cuando no sean tests automáticos
  if (process.env.NODE_ENV === 'development' && process.env.NODE_ENV !== 'test') {
    cuerpo.detalleTecnico = error.message;
  }

  return res.status(500).json(cuerpo);
}

module.exports = {
  rutaNoEncontrada,
  manejarErrores,
  traducir,
};
