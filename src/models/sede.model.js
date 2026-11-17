// Modelo: reglas de validación de una sede. La baja se hace solo con DELETE (borrado lógico)
const { ValidationError, BadRequestError } = require('../middlewares/errors/AppError');
const {
  esTextoValido,
  convertirBooleano,
  incluyeInactivos,
  revisarCamposPermitidos,
} = require('../utils/validaciones');

// activa no está: la bandera solo cambia con DELETE
const CAMPOS_PERMITIDOS = [
  'nombre',
  'distrito',
  'direccion',
  'telefono',
  'hora_apertura',
  'hora_cierre',
  'atiende_domingo',
];

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const FORMATO_TELEFONO = /^\d{9}$/;

function completarHora(hora) {
  return hora.length === 5 ? `${hora}:00` : hora;
}

function revisarCampos(datos) {
  revisarCamposPermitidos(datos, CAMPOS_PERMITIDOS);
}

function validarSede(datos) {
  const errores = [];

  if (!esTextoValido(datos.nombre, 80)) {
    errores.push('nombre es obligatorio y debe tener máximo 80 caracteres');
  }
  if (!esTextoValido(datos.distrito, 60)) {
    errores.push('distrito es obligatorio y debe tener máximo 60 caracteres');
  }
  if (!esTextoValido(datos.direccion, 150)) {
    errores.push('direccion es obligatoria y debe tener máximo 150 caracteres');
  }

  if (typeof datos.telefono !== 'string' || !FORMATO_TELEFONO.test(datos.telefono)) {
    errores.push('telefono debe ser texto de 9 dígitos, por ejemplo "014445566"');
  }

  const horaAperturaValida =
    typeof datos.hora_apertura === 'string' && FORMATO_HORA.test(datos.hora_apertura);
  const horaCierreValida =
    typeof datos.hora_cierre === 'string' && FORMATO_HORA.test(datos.hora_cierre);

  if (!horaAperturaValida) errores.push('hora_apertura debe tener formato HH:MM, por ejemplo "08:00"');
  if (!horaCierreValida) errores.push('hora_cierre debe tener formato HH:MM, por ejemplo "18:00"');

  if (horaAperturaValida && horaCierreValida) {
    if (completarHora(datos.hora_apertura) >= completarHora(datos.hora_cierre)) {
      errores.push('hora_apertura debe ser menor que hora_cierre');
    }
  }

  const atiendeDomingo =
    datos.atiende_domingo === undefined ? false : convertirBooleano(datos.atiende_domingo);
  if (atiendeDomingo === null) errores.push('atiende_domingo debe ser true o false');

  if (errores.length > 0) {
    throw new ValidationError(errores, 'Datos de la sede no válidos');
  }

  return {
    nombre: datos.nombre.trim(),
    distrito: datos.distrito.trim(),
    direccion: datos.direccion.trim(),
    telefono: datos.telefono,
    hora_apertura: completarHora(datos.hora_apertura),
    hora_cierre: completarHora(datos.hora_cierre),
    atiende_domingo: atiendeDomingo ? 1 : 0,
  };
}

function validarFiltros(filtros = {}) {
  const filtrosLimpios = {};

  if (filtros.distrito !== undefined) {
    if (!esTextoValido(filtros.distrito, 60)) {
      throw new BadRequestError('El filtro distrito no es válido');
    }
    filtrosLimpios.distrito = filtros.distrito.trim();
  }

  if (incluyeInactivos(filtros.incluir_inactivos)) {
    filtrosLimpios.incluirInactivos = true;
  }

  return filtrosLimpios;
}

module.exports = {
  CAMPOS_PERMITIDOS,
  revisarCampos,
  validarSede,
  validarFiltros,
};
