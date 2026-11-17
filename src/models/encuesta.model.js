/**
 * Modelo de Dominio: Encuesta (Kodo Motors)
 * Representa las encuestas de satisfacción y opinión de clientes vinculadas a órdenes de servicio.
 */
class Encuesta {
  constructor({
    id,
    orden_id,
    puntuacion,
    recomendaria,
    comentario = null,
    created_at = null,
    activo = 1
  }) {
    this.id = id ? Number(id) : undefined;
    this.ordenId = Number(orden_id);
    this.puntuacion = Number(puntuacion);
    this.recomendaria = Boolean(Number(recomendaria));
    this.comentario = comentario ? String(comentario).trim() : null;
    this.createdAt = created_at;
    this.activo = Boolean(Number(activo));
  }

  static fromRow(row) {
    if (!row) return null;
    return new Encuesta({
      id: row.id,
      orden_id: row.orden_id,
      puntuacion: row.puntuacion,
      recomendaria: row.recomendaria,
      comentario: row.comentario,
      created_at: row.created_at,
      activo: row.activo !== undefined ? row.activo : 1
    });
  }

  static validar(datos, esActualizacion = false) {
    const errores = [];

    // 1. Orden ID
    if (!esActualizacion || datos.orden_id !== undefined) {
      const ordenNum = Number(datos.orden_id);
      if (!datos.orden_id || isNaN(ordenNum) || !Number.isInteger(ordenNum) || ordenNum <= 0) {
        errores.push('El campo "orden_id" es obligatorio y debe ser un número entero positivo');
      }
    }

    // 2. Puntuación (1 a 5 estrellas)
    if (!esActualizacion || datos.puntuacion !== undefined) {
      const puntNum = Number(datos.puntuacion);
      if (datos.puntuacion === undefined || isNaN(puntNum) || !Number.isInteger(puntNum) || puntNum < 1 || puntNum > 5) {
        errores.push('El campo "puntuacion" es obligatorio y debe ser un número entero entre 1 y 5');
      }
    }

    // 3. Recomendaría (Booleano o 0/1)
    if (!esActualizacion || datos.recomendaria !== undefined) {
      const esBooleanoValido =
        typeof datos.recomendaria === 'boolean' ||
        datos.recomendaria === 0 ||
        datos.recomendaria === 1;
      if (!esBooleanoValido) {
        errores.push('El campo "recomendaria" es obligatorio (true/false o 1/0)');
      }
    }

    // 4. Comentario (Opcional, máx 300 caracteres)
    if (datos.comentario !== undefined && datos.comentario !== null) {
      if (typeof datos.comentario !== 'string' || datos.comentario.trim().length > 300) {
        errores.push('El campo "comentario" no puede superar los 300 caracteres');
      }
    }

    // 5. Borrado lógico: la bandera solo cambia con DELETE
    if (datos.activo !== undefined) {
      errores.push('El campo "activo" no se puede enviar; para dar de baja usa DELETE');
    }

    return errores;
  }
}

module.exports = Encuesta;
