// Integración de /api/sedes: la petición recorre rutas → auth → validadores → servicio → handler de errores.
// MySQL se reemplaza por repositorios en memoria con los datos del seed (tests/helpers/bd-memoria.js).
const {
  request, app, bd, LECTOR, ADMIN, esperarError, esperarValidacion, reiniciarDatos,
} = require('../helpers/api');

const sedeNueva = {
  nombre: 'Kodo San Isidro',
  distrito: 'San Isidro',
  direccion: 'Av. Javier Prado Este 1234',
  telefono: '014447788',
  hora_apertura: '08:00',
  hora_cierre: '18:00',
};

beforeEach(reiniciarDatos);

describe('GET /api/sedes', () => {
  test('200 · lista las 3 sedes activas del seed', async () => {
    const res = await request(app).get('/api/sedes').set(LECTOR);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({ id: 1, nombre: 'Kodo Surquillo', distrito: 'Surquillo' });
  });

  test('200 · filtra por distrito', async () => {
    const res = await request(app).get('/api/sedes').query({ distrito: 'La Molina' }).set(LECTOR);

    expect(res.status).toBe(200);
    expect(res.body.map((sede) => sede.nombre)).toEqual(['Kodo La Molina']);
  });

  test('200 · un distrito sin sedes devuelve una lista vacía, no un error', async () => {
    const res = await request(app).get('/api/sedes').query({ distrito: 'Miraflores' }).set(LECTOR);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('400 · filtro distrito vacío', async () => {
    const res = await request(app).get('/api/sedes').query({ distrito: '' }).set(LECTOR);

    esperarError(res, 400, 'SOLICITUD_INVALIDA');
  });
});

describe('GET /api/sedes/:id', () => {
  test('200 · devuelve la sede', async () => {
    const res = await request(app).get('/api/sedes/2').set(LECTOR);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 2, nombre: 'Kodo La Molina', atiende_domingo: true });
  });

  test('404 · la sede no existe', async () => {
    const res = await request(app).get('/api/sedes/999').set(LECTOR);

    esperarError(res, 404, 'NO_ENCONTRADO');
    expect(res.body.mensaje).toBe('No existe una sede con id 999');
    expect(res.body).not.toHaveProperty('errores');
  });

  test.each([['letras', 'abc'], ['cero', '0'], ['negativo', '-1'], ['decimal', '1.5']])(
    '400 · id inválido (%s) se rechaza ANTES de consultar la base',
    async (_nombre, id) => {
      const consulta = jest.spyOn(bd.sedes, 'buscarPorId');

      const res = await request(app).get(`/api/sedes/${id}`).set(LECTOR);

      expect(esperarValidacion(res)).toEqual(['id']);
      expect(consulta).not.toHaveBeenCalled();
      consulta.mockRestore();
    },
  );
});

describe('POST /api/sedes', () => {
  test('201 · crea la sede y la devuelve con id, horas completas y activa', async () => {
    const res = await request(app).post('/api/sedes').set(ADMIN).send(sedeNueva);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 4, ...sedeNueva, hora_apertura: '08:00:00', hora_cierre: '18:00:00', atiende_domingo: false, activa: true,
    });
  });

  test('201 · guarda el nombre saneado (sin espacios de más)', async () => {
    const res = await request(app).post('/api/sedes').set(ADMIN)
      .send({ ...sedeNueva, nombre: '  Kodo   San Isidro ' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Kodo San Isidro');
  });

  test('400 · body vacío: un error por cada campo obligatorio y no guarda nada', async () => {
    const res = await request(app).post('/api/sedes').set(ADMIN).send({});

    expect(esperarValidacion(res)).toEqual([
      'nombre', 'distrito', 'direccion', 'telefono', 'hora_apertura', 'hora_cierre',
    ]);
    expect((await request(app).get('/api/sedes').set(LECTOR)).body).toHaveLength(3);
  });

  test.each([
    ['teléfono de 8 dígitos', { telefono: '01444778' }, 'telefono'],
    ['teléfono de 10 dígitos', { telefono: '0144477889' }, 'telefono'],
    ['hora sin formato HH:MM', { hora_cierre: '6pm' }, 'hora_cierre'],
    ['nombre de 2 caracteres', { nombre: 'Ko' }, 'nombre'],
    ['nombre con HTML', { nombre: '<b>Kodo</b>' }, 'nombre'],
    ['atiende_domingo como texto', { atiende_domingo: 'si' }, 'atiende_domingo'],
    ['id enviado por el cliente', { id: 50 }, 'id'],
    ['activa enviada por el cliente', { activa: false }, 'activa'],
    ['campo que no existe', { gerente: 'Ana' }, 'gerente'],
  ])('400 · %s', async (_nombre, cambio, campo) => {
    const res = await request(app).post('/api/sedes').set(ADMIN).send({ ...sedeNueva, ...cambio });

    expect(esperarValidacion(res)).toEqual([campo]);
  });

  test.each([
    ['apertura igual al cierre', '18:00', '18:00'],
    ['apertura después del cierre', '19:00', '18:00'],
  ])('400 · regla de negocio: %s', async (_nombre, apertura, cierre) => {
    const res = await request(app).post('/api/sedes').set(ADMIN)
      .send({ ...sedeNueva, hora_apertura: apertura, hora_cierre: cierre });

    expect(esperarValidacion(res)).toEqual(['hora_apertura']);
    expect(res.body.errores[0].mensaje).toBe('hora_apertura debe ser menor que hora_cierre');
  });

  test('201 · límite válido: la sede abre un minuto antes de cerrar', async () => {
    const res = await request(app).post('/api/sedes').set(ADMIN)
      .send({ ...sedeNueva, hora_apertura: '17:59', hora_cierre: '18:00' });

    expect(res.status).toBe(201);
  });

  test('409 · nombre de una sede que ya existe', async () => {
    const res = await request(app).post('/api/sedes').set(ADMIN)
      .send({ ...sedeNueva, nombre: 'Kodo Surquillo' });

    esperarError(res, 409, 'CONFLICTO');
    expect(res.body.mensaje).toMatch(/Ya existe una sede/);
    expect(res.body).not.toHaveProperty('errores');
  });

  test('409 · nombre de una sede dada de baja: el mensaje lo aclara', async () => {
    await request(app).delete('/api/sedes/3').set(ADMIN);

    const res = await request(app).post('/api/sedes').set(ADMIN)
      .send({ ...sedeNueva, nombre: 'Kodo San Miguel' });

    esperarError(res, 409, 'CONFLICTO');
    expect(res.body.mensaje).toMatch(/dada de baja \(id 3\)/);
  });

  test('400 · JSON mal formado', async () => {
    const res = await request(app).post('/api/sedes').set(ADMIN)
      .set('Content-Type', 'application/json').send('{"nombre": "Kodo San Isidro",');

    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.mensaje).toBe('El cuerpo no es un JSON válido');
  });

  test('413 · cuerpo de más de 10 KB', async () => {
    const res = await request(app).post('/api/sedes').set(ADMIN)
      .send({ ...sedeNueva, direccion: 'A'.repeat(11000) });

    esperarError(res, 413, 'CUERPO_MUY_GRANDE');
  });
});

describe('PUT /api/sedes/:id', () => {
  test('200 · actualiza solo el campo enviado y conserva los demás', async () => {
    const res = await request(app).put('/api/sedes/1').set(ADMIN).send({ telefono: '987654321' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1, nombre: 'Kodo Surquillo', telefono: '987654321', hora_apertura: '08:00:00',
    });
  });

  test('200 · se puede reenviar su propio nombre sin que cuente como duplicado', async () => {
    const res = await request(app).put('/api/sedes/1').set(ADMIN)
      .send({ nombre: 'Kodo Surquillo', atiende_domingo: true });

    expect(res.status).toBe(200);
    expect(res.body.atiende_domingo).toBe(true);
  });

  test('400 · un cierre anterior a la apertura que ya estaba guardada', async () => {
    // Surquillo abre a las 08:00: el cliente solo envía el cierre
    const res = await request(app).put('/api/sedes/1').set(ADMIN).send({ hora_cierre: '07:30' });

    expect(esperarValidacion(res)).toEqual(['hora_apertura']);
    expect((await request(app).get('/api/sedes/1').set(LECTOR)).body.hora_cierre).toBe('18:00:00');
  });

  test('400 · body vacío', async () => {
    const res = await request(app).put('/api/sedes/1').set(ADMIN).send({});

    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.mensaje).toBe('Envía al menos un campo para actualizar');
  });

  test('400 · no se puede reactivar una sede con activa: true', async () => {
    const res = await request(app).put('/api/sedes/1').set(ADMIN).send({ activa: true });

    expect(esperarValidacion(res)).toEqual(['activa']);
  });

  test('404 · la sede no existe', async () => {
    const res = await request(app).put('/api/sedes/999').set(ADMIN).send({ telefono: '987654321' });

    esperarError(res, 404, 'NO_ENCONTRADO');
  });

  test('409 · renombrarla con el nombre de otra sede', async () => {
    const res = await request(app).put('/api/sedes/1').set(ADMIN).send({ nombre: 'Kodo La Molina' });

    esperarError(res, 409, 'CONFLICTO');
    expect((await request(app).get('/api/sedes/1').set(LECTOR)).body.nombre).toBe('Kodo Surquillo');
  });
});

describe('DELETE /api/sedes/:id (borrado lógico)', () => {
  test('204 · da de baja la sede: deja de listarse y responde 404 al consultarla', async () => {
    const res = await request(app).delete('/api/sedes/3').set(ADMIN);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect((await request(app).get('/api/sedes').set(LECTOR)).body).toHaveLength(2);
    esperarError(await request(app).get('/api/sedes/3').set(LECTOR), 404, 'NO_ENCONTRADO');
  });

  test('la fila no se borra: aparece con incluir_inactivos=true y activa en false', async () => {
    await request(app).delete('/api/sedes/3').set(ADMIN);

    const res = await request(app).get('/api/sedes').query({ incluir_inactivos: 'true' }).set(LECTOR);

    expect(res.body).toHaveLength(3);
    expect(res.body.find((sede) => sede.id === 3).activa).toBe(false);
  });

  test('404 · darla de baja dos veces', async () => {
    await request(app).delete('/api/sedes/3').set(ADMIN);

    esperarError(await request(app).delete('/api/sedes/3').set(ADMIN), 404, 'NO_ENCONTRADO');
  });

  test('409 · regla de negocio: no se da de baja una sede con citas pendientes', async () => {
    bd.ponerCitasPendientes({ sedeId: 1, cantidad: 2 });

    const res = await request(app).delete('/api/sedes/1').set(ADMIN);

    esperarError(res, 409, 'CONFLICTO');
    expect(res.body.mensaje).toMatch(/citas generadas pendientes \(2\)/);
    expect((await request(app).get('/api/sedes/1').set(LECTOR)).status).toBe(200);
  });
});

describe('errores inesperados en /api/sedes', () => {
  let consola;
  beforeEach(() => { consola = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  test('500 · un fallo interno responde genérico y no filtra el detalle', async () => {
    jest.spyOn(bd.sedes, 'listar').mockRejectedValueOnce(new Error('Cannot read properties of undefined (clave=secreta)'));

    const res = await request(app).get('/api/sedes').set(LECTOR);

    esperarError(res, 500, 'ERROR_INTERNO');
    expect(res.body.mensaje).toBe('Error interno del servidor');
    expect(JSON.stringify(res.body)).not.toMatch(/secreta|undefined|stack/);
    expect(consola).toHaveBeenCalled();
  });

  test('503 · con MySQL apagado no se filtra ECONNREFUSED ni el puerto', async () => {
    const caida = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3307'), { code: 'ECONNREFUSED' });
    jest.spyOn(bd.sedes, 'buscarPorId').mockRejectedValueOnce(caida);

    const res = await request(app).get('/api/sedes/1').set(LECTOR);

    esperarError(res, 503, 'SERVICIO_NO_DISPONIBLE');
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|3307/);
  });
});
