// Piezas reutilizables entre validadores.
const { body, param } = require('express-validator');

// Parámetro de ruta :id → entero positivo (y ya convertido a número).
const idParam = (nombre = 'id') =>
  param(nombre).isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt();

// En PATCH (actualización parcial) los campos son opcionales; en POST/PUT son obligatorios.
const campo = (nombre, parcial = false) => (parcial ? body(nombre).optional() : body(nombre));

// Valida que el valor exista en un repositorio (llave foránea).
const existeEn = (repo, etiqueta) => (valor) => {
  if (!repo.findById(valor)) throw new Error(`${etiqueta} indicado no existe`);
  return true;
};

// Campo que referencia a otra tabla: obligatorio, entero positivo y existente.
const idRelacion = (nombre, repo, etiqueta) =>
  body(nombre)
    .notEmpty().withMessage(`${nombre} es obligatorio`).bail()
    .isInt({ min: 1 }).withMessage(`${nombre} debe ser un entero positivo`).bail()
    .toInt()
    .custom(existeEn(repo, etiqueta));

// Fecha de hoy en formato AAAA-MM-DD (zona horaria de la máquina).
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Fecha AAAA-MM-DD obligatoria y real (rechaza 2026-02-30).
const fechaISO = (nombre, etiqueta) =>
  body(nombre).trim()
    .notEmpty().withMessage(`${etiqueta} es obligatoria`).bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`${etiqueta} debe tener formato AAAA-MM-DD`).bail()
    .isISO8601({ strict: true }).withMessage(`${etiqueta} no existe en el calendario`);

module.exports = { idParam, campo, existeEn, idRelacion, hoyISO, fechaISO };