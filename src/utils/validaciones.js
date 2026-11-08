// Utilidades de validación compartidas por los modelos (Semana 10)
const { BadRequestError, ValidationError } = require('../middlewares/errors/AppError');

function esTextoValido(valor, maximoCaracteres) {
  return (
    typeof valor === 'string' &&
    valor.trim().length > 0 &&
    valor.trim().length <= maximoCaracteres
  );
}

function convertirNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string' && valor.trim() !== '') {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }
  return null;
}

function convertirBooleano(valor) {
  if (valor === true || valor === 1 || valor === '1' || valor === 'true') return true;
  if (valor === false || valor === 0 || valor === '0' || valor === 'false') return false;
  return null;
}

// ?incluir_inactivos=true en un listado muestra también los registros dados de baja
function incluyeInactivos(valor) {
  return valor === true || valor === 'true';
}

function revisarCamposPermitidos(datos, camposPermitidos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new BadRequestError('El cuerpo de la solicitud debe ser un objeto JSON');
  }
  const camposDesconocidos = Object.keys(datos).filter(
    (campo) => !camposPermitidos.includes(campo)
  );
  if (camposDesconocidos.length > 0) {
    throw new ValidationError(
      camposDesconocidos.map((campo) => `${campo} no es un campo permitido`),
      `La solicitud tiene campos no permitidos. Campos permitidos: ${camposPermitidos.join(', ')}`
    );
  }
}

module.exports = {
  esTextoValido,
  convertirNumero,
  convertirBooleano,
  incluyeInactivos,
  revisarCamposPermitidos,
};
