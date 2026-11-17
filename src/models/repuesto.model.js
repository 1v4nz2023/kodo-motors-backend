/**
 * Modelo de Dominio: Repuesto (Kodo Motors)
 * Representa piezas y repuestos automotrices del inventario.
 */
class Repuesto {
  static MODELOS_PERMITIDOS = [
    'Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-90', 'BT-50', 'MX-5', 'Todos'
  ];

  static PRECIO_MAXIMO = 999999.99;

  constructor({
    id,
    codigo,
    nombre,
    modelo_compatible,
    stock = 0,
    stock_minimo = 5,
    precio,
    ubicacion = null,
    activo = 1
  }) {
    this.id = id ? Number(id) : undefined;
    this.codigo = codigo ? String(codigo).trim().toUpperCase() : '';
    this.nombre = nombre ? String(nombre).trim() : '';
    this.modeloCompatible = modelo_compatible;
    this.stock = Number(stock);
    this.stockMinimo = Number(stock_minimo);
    this.precio = Number(precio);
    this.ubicacion = ubicacion ? String(ubicacion).trim() : null;
    this.activo = Boolean(Number(activo));
    this.alertaBajoStock = this.stock <= this.stockMinimo;
  }

  static fromRow(row) {
    if (!row) return null;
    return new Repuesto({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      modelo_compatible: row.modelo_compatible,
      stock: row.stock,
      stock_minimo: row.stock_minimo,
      precio: Number(row.precio), // Convertir DECIMAL de mysql2 a Number
      ubicacion: row.ubicacion,
      activo: row.activo !== undefined ? row.activo : 1
    });
  }

  static validar(datos, esActualizacion = false) {
    const errores = [];

    // 1. Código
    if (!esActualizacion || datos.codigo !== undefined) {
      const codigoValido =
        typeof datos.codigo === 'string' &&
        datos.codigo.trim().length >= 3 &&
        datos.codigo.trim().length <= 20 &&
        /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(datos.codigo.trim());
      if (!codigoValido) {
        errores.push('El campo "codigo" es obligatorio, debe tener entre 3 y 20 caracteres y solo admite letras, números, punto, guion y guion bajo');
      }
    }

    // 2. Nombre
    if (!esActualizacion || datos.nombre !== undefined) {
      if (!datos.nombre || typeof datos.nombre !== 'string' || datos.nombre.trim() === '' || datos.nombre.trim().length > 100) {
        errores.push('El campo "nombre" es obligatorio y debe tener máximo 100 caracteres');
      }
    }

    // 3. Modelo Compatible
    if (!esActualizacion || datos.modelo_compatible !== undefined) {
      if (!Repuesto.MODELOS_PERMITIDOS.includes(datos.modelo_compatible)) {
        errores.push(`El campo "modelo_compatible" debe ser uno de: ${Repuesto.MODELOS_PERMITIDOS.join(', ')}`);
      }
    }

    // 4. Precio
    if (!esActualizacion || datos.precio !== undefined) {
      const precioNum = Number(datos.precio);
      const tieneMaximoDosDecimales = Number.isFinite(precioNum) && Number(precioNum.toFixed(2)) === precioNum;
      if (
        datos.precio === undefined ||
        !tieneMaximoDosDecimales ||
        precioNum <= 0 ||
        precioNum > Repuesto.PRECIO_MAXIMO
      ) {
        errores.push(`El campo "precio" es obligatorio, debe ser mayor a 0, máximo ${Repuesto.PRECIO_MAXIMO} y tener hasta 2 decimales`);
      }
    }

    // 5. Stock
    if (datos.stock !== undefined) {
      const stockNum = Number(datos.stock);
      if (isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0) {
        errores.push('El campo "stock" debe ser un número entero mayor o igual a 0');
      }
    }

    // 6. Stock Mínimo
    if (datos.stock_minimo !== undefined) {
      const minNum = Number(datos.stock_minimo);
      if (isNaN(minNum) || !Number.isInteger(minNum) || minNum < 0) {
        errores.push('El campo "stock_minimo" debe ser un número entero mayor o igual a 0');
      }
    }

    // 7. Ubicación (opcional, coincide con VARCHAR(20))
    if (datos.ubicacion !== undefined && datos.ubicacion !== null) {
      if (typeof datos.ubicacion !== 'string' || datos.ubicacion.trim().length > 20) {
        errores.push('El campo "ubicacion" debe ser texto de máximo 20 caracteres');
      }
    }

    // 8. Borrado lógico: la bandera solo cambia con DELETE
    if (datos.activo !== undefined) {
      errores.push('El campo "activo" no se puede enviar; para dar de baja usa DELETE');
    }

    return errores;
  }
}

module.exports = Repuesto;
