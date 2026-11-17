// Manejo central de errores — Semana 10 (Slides 20, 25, 26, 32, 33)
// Toda la API responde un JSON uniforme: { estado, tipo, mensaje, idTraza, ruta, [errores] }
const {
  AppError,
  HttpError,
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('./errors/AppError');

const ERRORES_DE_CONEXION = [
  'ECONNREFUSED',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'PROTOCOL_CONNECTION_LOST',
];

/**
 * Traduce excepciones crudas de MySQL o Express a instancias de AppError tipadas
 */
const traducir = (err) => {
  if (err instanceof AppError || err instanceof HttpError) return err;

  // JSON mal formado (Slide 25)
  if (err.type === 'entity.parse.failed') {
    return new BadRequestError('El cuerpo no es un JSON válido', [
      { campo: 'cuerpo', mensaje: 'Revisa comillas y comas.' },
    ]);
  }

  // Cuerpo excede el límite permitido (Slide 25)
  if (err.type === 'entity.too.large') {
    return new AppError(413, 'CUERPO_MUY_GRANDE', 'Cuerpo demasiado grande');
  }

  // Violación de restricción UNIQUE en MySQL (Slide 25)
  if (err.code === 'ER_DUP_ENTRY') {
    return new ConflictError('Ya existe un registro con esos datos');
  }

  // Clave foránea inexistente en MySQL (Slide 25)
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return new BadRequestError('Uno de los registros relacionados no existe');
  }

  // Excepciones lanzadas por triggers de MySQL (SIGNAL SQLSTATE '45000')
  if (err.code === 'ER_SIGNAL_EXCEPTION') {
    return new BadRequestError(err.sqlMessage || 'Operación no permitida');
  }

  // Problemas de conexión a la base de datos
  if (ERRORES_DE_CONEXION.includes(err.code)) {
    console.error('[BD]', err.code, err.message);
    return new AppError(
      503,
      'SERVICIO_NO_DISPONIBLE',
      'No hay conexión con la base de datos. Revisa que Docker esté levantado'
    );
  }

  return null;
};

/**
 * 404 para rutas no definidas: crea NotFoundError y lo delega con next()
 * para garantizar la misma estructura uniforme de respuesta (Slide 33)
 */
function rutaNoEncontrada(req, res, next) {
  const ruta = req && req.method && req.originalUrl ? `${req.method} ${req.originalUrl}` : (req?.url || '');
  next(new NotFoundError(`Ruta no encontrada: ${ruta}`));
}

/**
 * Middleware central de manejo de errores con 4 parámetros (Slide 20, 26, 32).
 * Express solo invoca este middleware si tiene exactamente 4 parámetros.
 */
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  const conocido = traducir(err);
  const idTraza = (req && req.idTraza) || 'sin-traza';
  const ruta = req && req.method && req.originalUrl
    ? `${req.method} ${req.originalUrl}`
    : (req && req.url ? `${req.method || ''} ${req.url}`.trim() : '');

  if (conocido) {
    const estado = conocido.estado || conocido.status || 500;
    const tipo = conocido.tipo || 'ERROR_GENERAL';
    const cuerpo = {
      estado,
      tipo,
      mensaje: conocido.message,
      idTraza,
      ruta,
    };
    const errores = conocido.detalle || conocido.errores;
    if (errores) {
      cuerpo.errores = errores;
    }
    return res.status(estado).json(cuerpo);
  }

  // Error inesperado: al log del servidor con idTraza y sin exponer detalles al cliente (Slide 26, 30, 32)
  console.error(`[${idTraza}]`, ruta, err);
  const cuerpo = {
    estado: 500,
    tipo: 'ERROR_INTERNO',
    mensaje: 'Error interno del servidor',
    idTraza,
    ruta,
  };
  if (process.env.NODE_ENV === 'development') {
    cuerpo.detalleTecnico = err.message;
  }
  return res.status(500).json(cuerpo);
}

module.exports = {
  traducir,
  rutaNoEncontrada,
  manejarErrores,
};
