/**
 * Suite de Pruebas de Verificación Automatizada (Kodo Motors) — npm test
 * No necesita la base de datos: los repositorios se reemplazan por funciones de prueba.
 * Valida:
 * 1. Cero sentencias "DELETE FROM" en src/ (borrado lógico garantizado)
 * 2. Ninguna contraseña en db.js, docker-compose.yml ni .env.example
 * 3. Reglas de negocio de repuestos (no dar de baja con stock > 0)
 * 4. Reglas de negocio de encuestas (solo órdenes entregadas, una por orden)
 * 5. Borrado lógico en los seis recursos (404 si ya estaba dado de baja)
 * 6. Validaciones de los modelos (la bandera activo/activa no se acepta en el body)
 * 7. Contrato común: validarId y manejarErrores
 */

const fs = require('fs');
const path = require('path');
const HttpError = require('./src/utils/http-error');
const Repuesto = require('./src/models/repuesto.model');
const Encuesta = require('./src/models/encuesta.model');
const Catalogo = require('./src/models/catalogo.model');
const reservaModelo = require('./src/models/reserva.model');
const sedeModelo = require('./src/models/sede.model');
const servicioModelo = require('./src/models/servicio.model');
const repuestosService = require('./src/services/repuestos.service');
const encuestasService = require('./src/services/encuestas.service');
const sedesService = require('./src/services/sedes.service');
const serviciosService = require('./src/services/servicios.service');
const catalogoService = require('./src/services/catalogo.service');
const reservaService = require('./src/services/reserva.service');
const repuestosRepository = require('./src/repositories/repuestos.repository');
const encuestasRepository = require('./src/repositories/encuestas.repository');
const sedesRepository = require('./src/repositories/sedes.repository');
const serviciosRepository = require('./src/repositories/servicios.repository');
const catalogoRepository = require('./src/repositories/catalogo.repository');
const reservaRepository = require('./src/repositories/reserva.repository');
const lookupsRepository = require('./src/repositories/lookups.repository');
const validarId = require('./src/middlewares/validarId');
const { manejarErrores } = require('./src/middlewares/manejarErrores');
const { pool } = require('./src/config/db');
const {
  AppError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} = require('./src/errors/AppError');
const trazabilidad = require('./src/middlewares/trazabilidad');
const { autenticar, autorizar } = require('./src/middlewares/auth');

const resultados = [];

function registrarPrueba(codigo, descripcion, paso, esperado, obtenido) {
  resultados.push({ codigo, descripcion, paso, esperado, obtenido });
  const icono = paso ? '✅ PASS' : '❌ FAIL';
  console.log(`${icono} [${codigo}] ${descripcion}`);
  if (!paso) {
    console.error(`   Esperado: ${esperado}`);
    console.error(`   Obtenido: ${obtenido}`);
  }
}

// Ejecuta fn y devuelve el error lanzado (o null si no lanzó nada)
async function capturarError(fn) {
  try {
    await fn();
    return null;
  } catch (error) {
    return error;
  }
}

function leer(rutaRelativa) {
  return fs.readFileSync(path.join(__dirname, rutaRelativa), 'utf8');
}

// Respuesta falsa de Express para probar el manejador de errores
function respuestaFalsa() {
  return {
    codigo: null,
    cuerpo: null,
    status(codigo) { this.codigo = codigo; return this; },
    json(cuerpo) { this.cuerpo = cuerpo; return this; },
  };
}

async function ejecutarSuite() {
  console.log('===============================================================');
  console.log('🧪 INICIANDO SUITE DE PRUEBAS DE CALIDAD (QA) - KODO MOTORS');
  console.log('===============================================================\n');

  // --- SECCIÓN 1: NINGÚN "DELETE FROM" EN EL CÓDIGO ---
  console.log('🔍 1. Verificación de Código Fuente (Auditoría Anti-Hard Delete)...');

  function scanDirForHardDelete(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let hallazgos = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        hallazgos = hallazgos.concat(scanDirForHardDelete(fullPath));
      } else if (entry.name.endsWith('.js')) {
        const text = fs.readFileSync(fullPath, 'utf8');
        const matches = text.match(/DELETE\s+FROM/gi);
        if (matches) {
          hallazgos.push({ file: fullPath, matches });
        }
      }
    }
    return hallazgos;
  }

  const hardDeletes = scanDirForHardDelete(path.join(__dirname, 'src'));
  registrarPrueba(
    'CP-01',
    'Ausencia total de sentencias SQL "DELETE FROM" en src/',
    hardDeletes.length === 0,
    '0 sentencias DELETE FROM en el backend',
    `${hardDeletes.length} sentencias encontradas: ${hardDeletes.map((h) => h.file).join(', ')}`
  );

  // --- SECCIÓN 2: SIN CREDENCIALES EN EL REPOSITORIO ---
  console.log('\n🔒 2. Auditoría de Seguridad de Credenciales...');

  const dbJs = leer('src/config/db.js');
  const dbConValorPorDefecto = /process\.env\.DB_(PASSWORD|USER)\s*\|\|/.test(dbJs);
  registrarPrueba(
    'CP-02',
    'db.js no define usuario ni contraseña por defecto',
    !dbConValorPorDefecto,
    'Credenciales solo desde el .env',
    dbConValorPorDefecto ? 'Valor por defecto encontrado' : 'Limpio'
  );

  const compose = leer('docker-compose.yml');
  const composeConValorPorDefecto = /\$\{[A-Z_]*(PASSWORD|USER)[A-Z_]*:-/.test(compose);
  registrarPrueba(
    'CP-03',
    'docker-compose.yml no trae credenciales por defecto (${VAR:-valor})',
    !composeConValorPorDefecto,
    'Variables exigidas con ${VAR:?mensaje}',
    composeConValorPorDefecto ? 'Valor por defecto encontrado' : 'Limpio'
  );

  // Cada contraseña del .env.example debe ser texto que describe qué va, no un valor
  const clavesEjemplo = leer('.env.example')
    .split(/\r?\n/)
    .filter((linea) => /^[A-Z_]*PASSWORD[A-Z_]*=/.test(linea))
    .map((linea) => linea.split('=').slice(1).join('='));
  const todasDescriptivas = clavesEjemplo.length > 0 && clavesEjemplo.every((valor) => valor.startsWith('contraseña_'));
  registrarPrueba(
    'CP-04',
    '.env.example solo describe las contraseñas, no las incluye',
    todasDescriptivas,
    'Cada *_PASSWORD con un texto "contraseña_..."',
    `Valores: ${clavesEjemplo.length} revisados, descriptivos=${todasDescriptivas}`
  );

  // --- SECCIÓN 3: REGLAS DE NEGOCIO - REPUESTOS ---
  console.log('\n📦 3. Reglas de Negocio de Repuestos (Borrado lógico)...');

  const origRep = { ...repuestosRepository };
  const origEnc = { ...encuestasRepository };
  const origSedes = { ...sedesRepository };
  const origServicios = { ...serviciosRepository };
  const origCatalogo = { ...catalogoRepository };
  const origReserva = { ...reservaRepository };
  const origLookups = { ...lookupsRepository };

  repuestosRepository.findById = async () => new Repuesto({
    id: 10, codigo: 'TST-001', nombre: 'Filtro Test', modelo_compatible: 'CX-5',
    stock: 4, stock_minimo: 2, precio: 80, activo: 1
  });
  let error = await capturarError(() => repuestosService.eliminar(10));
  registrarPrueba(
    'CP-05',
    'Bloquear baja de repuesto si aún cuenta con stock > 0',
    error instanceof HttpError && error.status === 400 && error.message.includes('stock disponible'),
    'HTTP 400 con advertencia de stock',
    error ? `HTTP ${error.status}: ${error.message}` : 'Permitió eliminar'
  );

  repuestosRepository.findById = async () => new Repuesto({
    id: 11, codigo: 'TST-002', nombre: 'Bujía Test', modelo_compatible: 'Mazda3',
    stock: 0, stock_minimo: 2, precio: 35, activo: 1
  });
  let llamadoBajaRepuesto = false;
  repuestosRepository.remove = async () => { llamadoBajaRepuesto = true; return true; };
  error = await capturarError(() => repuestosService.eliminar(11));
  registrarPrueba(
    'CP-06',
    'Borrado lógico de repuesto con stock 0',
    !error && llamadoBajaRepuesto,
    'Sin error y llamada a remove() (UPDATE activo = 0)',
    `error=${error && error.message}, remove llamado=${llamadoBajaRepuesto}`
  );

  repuestosRepository.findByCodigo = async () => new Repuesto({
    id: 12, codigo: 'TST-003', nombre: 'Pastilla', modelo_compatible: 'CX-30', precio: 50, activo: 0
  });
  error = await capturarError(() => repuestosService.crear({
    codigo: 'TST-003', nombre: 'Pastilla nueva', modelo_compatible: 'CX-30', precio: 55
  }));
  registrarPrueba(
    'CP-07',
    'Código de repuesto que pertenece a uno dado de baja → 409',
    error instanceof HttpError && error.status === 409 && error.message.includes('dado de baja'),
    'HTTP 409 aclarando que está dado de baja',
    error ? `HTTP ${error.status}: ${error.message}` : 'Permitió crear'
  );

  // --- SECCIÓN 4: REGLAS DE NEGOCIO - ENCUESTAS ---
  console.log('\n📋 4. Reglas de Negocio de Encuestas (Orden Entregada)...');

  encuestasRepository.findByOrdenId = async () => null;

  for (const [codigo, estado] of [['CP-08', 'en_proceso'], ['CP-09', 'listo']]) {
    encuestasRepository.findOrdenServicioById = async () => ({ id: 20, estado });
    error = await capturarError(() => encuestasService.crear({ orden_id: 20, puntuacion: 5, recomendaria: true }));
    registrarPrueba(
      codigo,
      `Rechazar encuesta para orden en estado "${estado}"`,
      error instanceof HttpError && error.status === 400 && error.message.includes('entregado'),
      'HTTP 400 indicando orden no entregada',
      error ? `HTTP ${error.status}: ${error.message}` : 'Permitió crear'
    );
  }

  encuestasRepository.findOrdenServicioById = async () => null;
  error = await capturarError(() => encuestasService.crear({ orden_id: 999, puntuacion: 5, recomendaria: true }));
  registrarPrueba(
    'CP-10',
    'Rechazar encuesta para orden inexistente (404)',
    error instanceof HttpError && error.status === 404,
    'HTTP 404',
    error ? `HTTP ${error.status}: ${error.message}` : 'Permitió crear'
  );

  encuestasRepository.findOrdenServicioById = async () => ({ id: 22, estado: 'entregado' });
  encuestasRepository.findByOrdenId = async () => null;
  encuestasRepository.create = async (datos) => new Encuesta({
    id: 1, orden_id: datos.orden_id, puntuacion: datos.puntuacion,
    recomendaria: datos.recomendaria, comentario: datos.comentario || null, activo: 1
  });
  const nuevaEncuesta = await encuestasService.crear({ orden_id: 22, puntuacion: 5, recomendaria: true, comentario: 'Excelente' });
  registrarPrueba(
    'CP-11',
    'Aceptar encuesta cuando la orden está en estado "entregado"',
    nuevaEncuesta && nuevaEncuesta.ordenId === 22 && nuevaEncuesta.activo === true,
    'Encuesta creada con orden 22 y activo=true',
    `Creada ordenId=${nuevaEncuesta?.ordenId}, activo=${nuevaEncuesta?.activo}`
  );

  encuestasRepository.findByOrdenId = async () => new Encuesta({ id: 1, orden_id: 22, puntuacion: 5, recomendaria: true, activo: 1 });
  error = await capturarError(() => encuestasService.crear({ orden_id: 22, puntuacion: 5, recomendaria: true }));
  registrarPrueba(
    'CP-12',
    'Rechazar una segunda encuesta para la misma orden (409)',
    error instanceof HttpError && error.status === 409 && error.message.includes('ya cuenta con una encuesta'),
    'HTTP 409 por duplicidad',
    error ? `HTTP ${error.status}: ${error.message}` : 'Permitió duplicar'
  );

  // --- SECCIÓN 5: BORRADO LÓGICO EN LOS SEIS RECURSOS ---
  console.log('\n🗑️ 5. Borrado lógico en los seis recursos...');

  encuestasRepository.findById = async () => new Encuesta({ id: 30, orden_id: 22, puntuacion: 5, recomendaria: true, activo: 1 });
  let llamadoBajaEncuesta = false;
  encuestasRepository.remove = async () => { llamadoBajaEncuesta = true; return true; };
  error = await capturarError(() => encuestasService.eliminar(30));
  registrarPrueba(
    'CP-13',
    'Borrado lógico de encuesta (remove() en lugar de DELETE físico)',
    !error && llamadoBajaEncuesta,
    'Sin error y llamada a remove()',
    `error=${error && error.message}, remove llamado=${llamadoBajaEncuesta}`
  );

  // Si el repositorio no encuentra una fila activa que dar de baja, el servicio responde 404
  repuestosRepository.findById = async () => null;
  encuestasRepository.findById = async () => null;
  sedesRepository.eliminar = async () => false;
  serviciosRepository.eliminar = async () => false;
  catalogoRepository.remove = async () => false;
  reservaRepository.eliminar = async () => false;

  const recursos = [
    ['CP-14', 'una sede', () => sedesService.eliminarSede(5)],
    ['CP-15', 'un servicio', () => serviciosService.eliminarServicio(5)],
    ['CP-16', 'un vehículo del catálogo', () => catalogoService.eliminar(5)],
    ['CP-17', 'una reserva', () => reservaService.eliminar(5)],
    ['CP-18', 'un repuesto', () => repuestosService.eliminar(5)],
    ['CP-19', 'una encuesta', () => encuestasService.eliminar(5)],
  ];
  for (const [codigo, nombre, eliminar] of recursos) {
    error = await capturarError(eliminar);
    registrarPrueba(
      codigo,
      `Dar de baja ${nombre} que no existe o ya está de baja → 404`,
      error instanceof HttpError && error.status === 404,
      'HTTP 404',
      error ? `HTTP ${error.status}: ${error.message}` : 'No lanzó error'
    );
  }

  sedesRepository.buscarPorNombre = async () => ({ id: 3, activa: false });
  error = await capturarError(() => sedesService.crearSede({
    nombre: 'Kodo San Miguel', distrito: 'San Miguel', direccion: 'Av. La Marina 2300',
    telefono: '015661122', hora_apertura: '09:00', hora_cierre: '18:00'
  }));
  registrarPrueba(
    'CP-20',
    'Nombre de sede que pertenece a una sede dada de baja → 409',
    error instanceof HttpError && error.status === 409 && error.message.includes('dada de baja'),
    'HTTP 409 aclarando que está dada de baja',
    error ? `HTTP ${error.status}: ${error.message}` : 'Permitió crear'
  );

  // --- SECCIÓN 6: VALIDACIONES DE LOS MODELOS ---
  console.log('\n🧾 6. Validaciones de los modelos...');

  error = await capturarError(() => sedeModelo.revisarCampos({ nombre: 'X', activa: false }));
  registrarPrueba(
    'CP-21',
    'Sedes: activa no se acepta en el body',
    error instanceof HttpError && error.status === 400 && error.errores.some((e) => e.includes('activa')),
    'HTTP 400 con "activa no es un campo permitido"',
    error ? `HTTP ${error.status}: ${JSON.stringify(error.errores)}` : 'Lo aceptó'
  );

  error = await capturarError(() => servicioModelo.revisarCampos({ nombre: 'X', activo: true }));
  registrarPrueba(
    'CP-22',
    'Servicios: activo no se acepta en el body',
    error instanceof HttpError && error.status === 400 && error.errores.some((e) => e.includes('activo')),
    'HTTP 400 con "activo no es un campo permitido"',
    error ? `HTTP ${error.status}: ${JSON.stringify(error.errores)}` : 'Lo aceptó'
  );

  error = await capturarError(() => sedeModelo.validarSede({ nombre: '', telefono: '123' }));
  registrarPrueba(
    'CP-23',
    'Sedes: datos incompletos devuelven la lista de errores',
    error instanceof HttpError && error.status === 400 && error.errores.length >= 4,
    'HTTP 400 con un error por campo',
    error ? `HTTP ${error.status}: ${error.errores.length} errores` : 'Lo aceptó'
  );

  const erroresCatalogo = Catalogo.validar({
    modelo: 'CX-5', version: 'Grand Touring', anio: 2026, precio_usd: 38990,
    combustible: 'gasolina', transmision: 'automatica', activo: false
  });
  registrarPrueba(
    'CP-24',
    'Catálogo: activo no se acepta en el body',
    erroresCatalogo.length === 1 && erroresCatalogo[0].includes('activo'),
    'Un error sobre activo',
    JSON.stringify(erroresCatalogo)
  );

  const erroresReservaVacia = reservaModelo.validar({});
  const erroresReservaActivo = reservaModelo.validar({ activo: false }, { parcial: true });
  registrarPrueba(
    'CP-25',
    'Reservas: campos obligatorios y activo rechazado',
    erroresReservaVacia.length === 5 && erroresReservaActivo.length === 1,
    '5 obligatorios faltantes; 1 error por activo',
    `obligatorios=${erroresReservaVacia.length}, activo=${erroresReservaActivo.length}`
  );

  const erroresRepuesto = Repuesto.validar({ activo: 0 }, true);
  const erroresEncuesta = Encuesta.validar({ activo: 0 }, true);
  registrarPrueba(
    'CP-26',
    'Repuestos y encuestas: activo rechazado en la actualización',
    erroresRepuesto.length === 1 && erroresEncuesta.length === 1,
    'Un error por modelo',
    `repuesto=${erroresRepuesto.length}, encuesta=${erroresEncuesta.length}`
  );

  // --- SECCIÓN 7: CONTRATO COMÚN ---
  console.log('\n🧩 7. Contrato común (validarId y manejarErrores)...');

  let errorRecibido = null;
  validarId({ params: { id: 'abc' } }, {}, (err) => { errorRecibido = err; });
  let siguienteSinError = false;
  validarId({ params: { id: '7' } }, {}, (err) => { siguienteSinError = err === undefined; });
  registrarPrueba(
    'CP-27',
    'validarId: "abc" → 400; "7" → continúa',
    errorRecibido instanceof HttpError && errorRecibido.status === 400 && siguienteSinError,
    'HttpError 400 y luego next() sin error',
    `abc=${errorRecibido && errorRecibido.status}, 7 continúa=${siguienteSinError}`
  );

  let res = respuestaFalsa();
  manejarErrores(new HttpError(400, 'Datos inválidos', ['nombre es obligatorio']), {}, res, () => {});
  registrarPrueba(
    'CP-28',
    'manejarErrores: HttpError → { mensaje, errores }',
    res.codigo === 400 && res.cuerpo.mensaje === 'Datos inválidos' && res.cuerpo.errores.length === 1,
    '400 { mensaje, errores }',
    `${res.codigo} ${JSON.stringify(res.cuerpo)}`
  );

  res = respuestaFalsa();
  manejarErrores(Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }), {}, res, () => {});
  registrarPrueba(
    'CP-29',
    'manejarErrores: ER_DUP_ENTRY de MySQL → 409',
    res.codigo === 409 && typeof res.cuerpo.mensaje === 'string',
    '409 { mensaje }',
    `${res.codigo} ${JSON.stringify(res.cuerpo)}`
  );

  res = respuestaFalsa();
  const errorConsola = console.error;
  console.error = () => {};
  manejarErrores(new Error('detalle interno que no debe salir'), {}, res, () => {});
  console.error = errorConsola;
  registrarPrueba(
    'CP-30',
    'manejarErrores: error inesperado → 500 sin detalles internos',
    res.codigo === 500 && !JSON.stringify(res.cuerpo).includes('detalle interno'),
    '500 { mensaje: "Error interno del servidor" }',
    `${res.codigo} ${JSON.stringify(res.cuerpo)}`
  );

  // --- SECCIÓN 8: CAPA DE MANEJO DE ERRORES - SEMANA 10 (SEDES, SERVICIOS Y RESERVAS) ---
  console.log('\n🛡️ 8. Capa de Manejo de Errores - Semana 10 (Sedes, Servicios y Reservas)...');

  // SEDES
  sedesRepository.buscarPorId = async () => null;
  error = await capturarError(() => sedesService.buscarSedePorId(999));
  registrarPrueba(
    'CP-31',
    'Sedes: buscar inexistente lanza NotFoundError (404, NO_ENCONTRADO)',
    error instanceof NotFoundError && error.estado === 404 && error.tipo === 'NO_ENCONTRADO',
    'NotFoundError 404 NO_ENCONTRADO',
    error ? `${error.name} ${error.estado} ${error.tipo}` : 'No lanzó error'
  );

  sedesRepository.buscarPorNombre = async () => ({ id: 1, activa: true });
  error = await capturarError(() => sedesService.crearSede({
    nombre: 'Sede Existente', distrito: 'Surco', direccion: 'Av. Primavera 100',
    telefono: '014445566', hora_apertura: '08:00', hora_cierre: '18:00'
  }));
  registrarPrueba(
    'CP-32',
    'Sedes: conflicto por nombre duplicado lanza ConflictError (409, CONFLICTO)',
    error instanceof ConflictError && error.estado === 409 && error.tipo === 'CONFLICTO',
    'ConflictError 409 CONFLICTO',
    error ? `${error.name} ${error.estado} ${error.tipo}` : 'No lanzó error'
  );

  error = await capturarError(() => sedesService.actualizarSede(1, {}));
  registrarPrueba(
    'CP-33',
    'Sedes: actualizar sin campos lanza BadRequestError (400, SOLICITUD_INVALIDA)',
    error instanceof BadRequestError && error.estado === 400 && error.tipo === 'SOLICITUD_INVALIDA',
    'BadRequestError 400 SOLICITUD_INVALIDA',
    error ? `${error.name} ${error.estado} ${error.tipo}` : 'No lanzó error'
  );

  // SERVICIOS
  serviciosRepository.buscarPorId = async () => null;
  error = await capturarError(() => serviciosService.buscarServicioPorId(999));
  registrarPrueba(
    'CP-34',
    'Servicios: buscar inexistente lanza NotFoundError (404, NO_ENCONTRADO)',
    error instanceof NotFoundError && error.estado === 404 && error.tipo === 'NO_ENCONTRADO',
    'NotFoundError 404 NO_ENCONTRADO',
    error ? `${error.name} ${error.estado} ${error.tipo}` : 'No lanzó error'
  );

  serviciosRepository.buscarPorNombre = async () => ({ id: 1, activo: true });
  error = await capturarError(() => serviciosService.crearServicio({
    nombre: 'Alineación', categoria: 'mantenimiento', precio: 120, duracion_min: 45
  }));
  registrarPrueba(
    'CP-35',
    'Servicios: conflicto por nombre repetido lanza ConflictError (409, CONFLICTO)',
    error instanceof ConflictError && error.estado === 409 && error.tipo === 'CONFLICTO',
    'ConflictError 409 CONFLICTO',
    error ? `${error.name} ${error.estado} ${error.tipo}` : 'No lanzó error'
  );

  error = await capturarError(() => servicioModelo.validarServicio({
    nombre: 'Test', categoria: 'categoria_invalida', precio: -10, duracion_min: 0
  }));
  registrarPrueba(
    'CP-36',
    'Servicios: datos inválidos lanzan ValidationError (400, VALIDACION) con lista de errores',
    error instanceof ValidationError && error.estado === 400 && error.tipo === 'VALIDACION' && Array.isArray(error.detalle),
    'ValidationError 400 VALIDACION con detalle[]',
    error ? `${error.name} ${error.estado} ${error.tipo} ${JSON.stringify(error.detalle)}` : 'No lanzó error'
  );

  // RESERVAS
  reservaRepository.obtenerPorId = async () => null;
  error = await capturarError(() => reservaService.obtenerPorId(999));
  registrarPrueba(
    'CP-37',
    'Reservas: buscar inexistente lanza NotFoundError (404, NO_ENCONTRADO)',
    error instanceof NotFoundError && error.estado === 404 && error.tipo === 'NO_ENCONTRADO',
    'NotFoundError 404 NO_ENCONTRADO',
    error ? `${error.name} ${error.estado} ${error.tipo}` : 'No lanzó error'
  );

  lookupsRepository.existeSede = async () => true;
  lookupsRepository.existeServicio = async () => true;
  lookupsRepository.existeVehiculo = async () => true;
  reservaRepository.existeChoque = async () => true;
  error = await capturarError(() => reservaService.crear({
    fecha: '2026-12-01', hora: '10:00', sede_id: 1, servicio_id: 1, vehiculo_id: 1
  }));
  registrarPrueba(
    'CP-38',
    'Reservas: choque de horario en misma sede, fecha y hora lanza ConflictError (409, CONFLICTO)',
    error instanceof ConflictError && error.estado === 409 && error.tipo === 'CONFLICTO',
    'ConflictError 409 CONFLICTO',
    error ? `${error.name} ${error.estado} ${error.tipo}` : 'No lanzó error'
  );

  error = await capturarError(() => reservaService.crear({}));
  registrarPrueba(
    'CP-39',
    'Reservas: body vacío lanza ValidationError (400, VALIDACION) con lista de errores',
    error instanceof ValidationError && error.estado === 400 && error.tipo === 'VALIDACION' && error.detalle.length >= 5,
    'ValidationError 400 VALIDACION con al menos 5 campos faltantes',
    error ? `${error.name} ${error.estado} ${error.tipo} ${JSON.stringify(error.detalle)}` : 'No lanzó error'
  );

  // TRAZABILIDAD Y FORMATO DE ERROR
  const reqFalsa = { header: () => null, headers: {} };
  const resFalsaTrazabilidad = {
    cabeceras: {},
    setHeader(nombre, valor) { this.cabeceras[nombre] = valor; }
  };
  trazabilidad(reqFalsa, resFalsaTrazabilidad, () => {});
  registrarPrueba(
    'CP-40',
    'Trazabilidad: asigna req.idTraza (8 caracteres) y cabecera X-Request-Id',
    typeof reqFalsa.idTraza === 'string' && reqFalsa.idTraza.length === 8 && resFalsaTrazabilidad.cabeceras['X-Request-Id'] === reqFalsa.idTraza,
    'idTraza de 8 caracteres y cabecera X-Request-Id coincidente',
    `idTraza=${reqFalsa.idTraza}, header=${resFalsaTrazabilidad.cabeceras['X-Request-Id']}`
  );

  res = respuestaFalsa();
  const reqConTraza = { idTraza: 'abc12345', method: 'GET', originalUrl: '/api/reservas/999' };
  manejarErrores(new NotFoundError('La reserva con id 999 no existe'), reqConTraza, res, () => {});
  const cumpleContrato = res.codigo === 404 &&
    res.cuerpo.estado === 404 &&
    res.cuerpo.tipo === 'NO_ENCONTRADO' &&
    res.cuerpo.mensaje === 'La reserva con id 999 no existe' &&
    res.cuerpo.idTraza === 'abc12345' &&
    res.cuerpo.ruta === 'GET /api/reservas/999';
  registrarPrueba(
    'CP-41',
    'Contrato de error: respuesta estándar con { estado, tipo, mensaje, idTraza, ruta }',
    cumpleContrato,
    'Respuesta completa del contrato de error',
    JSON.stringify(res.cuerpo)
  );

  let errAuth = null;
  autenticar({ header: () => null }, {}, (err) => { errAuth = err; });
  let errRol = null;
  autorizar('admin')({ header: () => 'recepcion' }, {}, (err) => { errRol = err; });
  registrarPrueba(
    'CP-42',
    'Autenticación y Autorización (401 y 403): UnauthorizedError y ForbiddenError',
    errAuth instanceof UnauthorizedError && errAuth.estado === 401 && errAuth.tipo === 'NO_AUTENTICADO' &&
    errRol instanceof ForbiddenError && errRol.estado === 403 && errRol.tipo === 'SIN_PERMISO',
    '401 NO_AUTENTICADO y 403 SIN_PERMISO',
    `auth=${errAuth && errAuth.estado} (${errAuth && errAuth.tipo}), rol=${errRol && errRol.estado} (${errRol && errRol.tipo})`
  );

  // Restaurar repositorios originales
  Object.assign(repuestosRepository, origRep);
  Object.assign(encuestasRepository, origEnc);
  Object.assign(sedesRepository, origSedes);
  Object.assign(serviciosRepository, origServicios);
  Object.assign(catalogoRepository, origCatalogo);
  Object.assign(reservaRepository, origReserva);
  Object.assign(lookupsRepository, origLookups);

  // Resumen final
  console.log('\n===============================================================');
  const aprobadas = resultados.filter((r) => r.paso).length;
  const fallidas = resultados.filter((r) => !r.paso).length;
  console.log(`📊 RESUMEN: ${aprobadas} Aprobadas, ${fallidas} Fallidas de un total de ${resultados.length} pruebas.`);
  if (fallidas === 0) {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
  } else {
    console.error('⚠️ Se detectaron fallas en las pruebas.');
  }
  console.log('===============================================================\n');

  // npm test falla si alguna prueba falla
  process.exitCode = fallidas === 0 ? 0 : 1;
}

ejecutarSuite()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
