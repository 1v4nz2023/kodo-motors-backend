// Integración de /api/servicios: la petición recorre rutas → auth → validadores → servicio → handler de errores.
// MySQL se reemplaza por repositorios en memoria con los datos del seed (tests/helpers/bd-memoria.js).
const {
  request, app, bd, LECTOR, ADMIN, esperarError, esperarValidacion, reiniciarDatos,
} = require('../helpers/api');

const servicioNuevo = {
  nombre: 'Cambio de aceite',
  categoria: 'mantenimiento',
  descripcion: 'Aceite sintético y filtro',
  precio: 180,
  duracion_min: 45,
};

beforeEach(reiniciarDatos);

describe('GET /api/servicios', () => {
  test('200 · lista los 5 servicios activos del seed', async () => {
    const res = await request(app).get('/api/servicios').set(LECTOR);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0]).toMatchObject({ id: 1, nombre: 'Mantenimiento 10 000 km', precio: 380 });
  });

  test('200 · filtra por categoría', async () => {
    const res = await request(app).get('/api/servicios').query({ categoria: 'frenos' }).set(LECTOR);

    expect(res.status).toBe(200);
    expect(res.body.map((servicio) => servicio.nombre)).toEqual(['Cambio de pastillas de freno']);
  });

  test('400 · filtro por una categoría que no existe', async () => {
    const res = await request(app).get('/api/servicios').query({ categoria: 'lavado' }).set(LECTOR);

    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.mensaje).toMatch(/categoria debe ser una de/);
  });
});

describe('GET /api/servicios/:id', () => {
  test('200 · devuelve el servicio con el precio como número', async () => {
    const res = await request(app).get('/api/servicios/2').set(LECTOR);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 2, nombre: 'Diagnóstico computarizado', precio: 150, duracion_min: 60 });
  });

  test('404 · el servicio no existe', async () => {
    const res = await request(app).get('/api/servicios/999').set(LECTOR);

    esperarError(res, 404, 'NO_ENCONTRADO');
    expect(res.body.mensaje).toBe('No existe un servicio con id 999');
  });

  test('400 · id que no es un entero positivo', async () => {
    const res = await request(app).get('/api/servicios/abc').set(LECTOR);

    expect(esperarValidacion(res)).toEqual(['id']);
  });
});

describe('POST /api/servicios', () => {
  test('201 · crea el servicio y lo devuelve con id y activo', async () => {
    const res = await request(app).post('/api/servicios').set(ADMIN).send(servicioNuevo);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 6, ...servicioNuevo, activo: true });
  });

  test('201 · sin descripción: se guarda como null', async () => {
    const { descripcion, ...sinDescripcion } = servicioNuevo;

    const res = await request(app).post('/api/servicios').set(ADMIN).send(sinDescripcion);

    expect(res.status).toBe(201);
    expect(res.body.descripcion).toBeNull();
  });

  test('400 · body vacío: un error por cada campo obligatorio y no guarda nada', async () => {
    const res = await request(app).post('/api/servicios').set(ADMIN).send({});

    expect(esperarValidacion(res)).toEqual(['nombre', 'categoria', 'precio', 'duracion_min']);
    expect((await request(app).get('/api/servicios').set(LECTOR)).body).toHaveLength(5);
  });

  // Ambos lados de cada límite (Semana 11, Slide 17)
  test.each([
    ['precio 0', { precio: 0 }, 400],
    ['precio 0.01 (mínimo)', { precio: 0.01 }, 201],
    ['precio 999999.99 (máximo)', { precio: 999999.99 }, 201],
    ['precio 1000000', { precio: 1000000 }, 400],
    ['duración 14 min', { duracion_min: 14 }, 400],
    ['duración 15 min (mínimo)', { duracion_min: 15 }, 201],
    ['duración 480 min (máximo)', { duracion_min: 480 }, 201],
    ['duración 481 min', { duracion_min: 481 }, 400],
  ])('límite · %s → %i', async (_nombre, cambio, esperado) => {
    const res = await request(app).post('/api/servicios').set(ADMIN).send({ ...servicioNuevo, ...cambio });

    expect(res.status).toBe(esperado);
    if (esperado === 400) expect(esperarValidacion(res)).toEqual(Object.keys(cambio));
  });

  test.each([
    ['precio negativo', { precio: -500 }, 'precio'],
    ['precio con 3 decimales', { precio: 99.999 }, 'precio'],
    ['precio como texto libre', { precio: 'gratis' }, 'precio'],
    ['duración con decimales', { duracion_min: 30.5 }, 'duracion_min'],
    ['categoría fuera de la lista', { categoria: 'lavado' }, 'categoria'],
    ['nombre de 2 caracteres', { nombre: 'Ab' }, 'nombre'],
    ['descripción con HTML', { descripcion: '<script>x</script>' }, 'descripcion'],
    ['descripción de 256 caracteres', { descripcion: 'a'.repeat(256) }, 'descripcion'],
    ['activo enviado por el cliente', { activo: false }, 'activo'],
    ['campo que no existe', { garantia_meses: 6 }, 'garantia_meses'],
  ])('400 · %s', async (_nombre, cambio, campo) => {
    const res = await request(app).post('/api/servicios').set(ADMIN).send({ ...servicioNuevo, ...cambio });

    expect(esperarValidacion(res)).toEqual([campo]);
  });

  test('400 · varios campos mal: informa todos a la vez', async () => {
    const res = await request(app).post('/api/servicios').set(ADMIN)
      .send({ ...servicioNuevo, categoria: 'lavado', precio: -1, duracion_min: 5 });

    expect(esperarValidacion(res)).toEqual(['categoria', 'precio', 'duracion_min']);
  });

  test('409 · nombre de un servicio que ya existe', async () => {
    const res = await request(app).post('/api/servicios').set(ADMIN)
      .send({ ...servicioNuevo, nombre: 'Revisión de batería' });

    esperarError(res, 409, 'CONFLICTO');
    expect(res.body.mensaje).toMatch(/Ya existe un servicio/);
    expect((await request(app).get('/api/servicios').set(LECTOR)).body).toHaveLength(5);
  });
});

describe('PUT /api/servicios/:id', () => {
  test('200 · cambia solo el precio y conserva los demás campos', async () => {
    const res = await request(app).put('/api/servicios/1').set(ADMIN).send({ precio: 399.9 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1, nombre: 'Mantenimiento 10 000 km', categoria: 'mantenimiento', precio: 399.9, duracion_min: 120,
    });
  });

  test('200 · descripción null borra la descripción', async () => {
    const res = await request(app).put('/api/servicios/1').set(ADMIN).send({ descripcion: null });

    expect(res.status).toBe(200);
    expect(res.body.descripcion).toBeNull();
  });

  test('400 · precio inválido: el servicio queda como estaba', async () => {
    const res = await request(app).put('/api/servicios/1').set(ADMIN).send({ precio: 0 });

    expect(esperarValidacion(res)).toEqual(['precio']);
    expect((await request(app).get('/api/servicios/1').set(LECTOR)).body.precio).toBe(380);
  });

  test('400 · body vacío', async () => {
    const res = await request(app).put('/api/servicios/1').set(ADMIN).send({});

    esperarError(res, 400, 'SOLICITUD_INVALIDA');
  });

  test('404 · el servicio no existe', async () => {
    const res = await request(app).put('/api/servicios/999').set(ADMIN).send({ precio: 100 });

    esperarError(res, 404, 'NO_ENCONTRADO');
  });

  test('409 · renombrarlo con el nombre de otro servicio', async () => {
    const res = await request(app).put('/api/servicios/1').set(ADMIN)
      .send({ nombre: 'Alineamiento y balanceo' });

    esperarError(res, 409, 'CONFLICTO');
  });
});

describe('DELETE /api/servicios/:id (borrado lógico)', () => {
  test('204 · da de baja el servicio: deja de listarse y responde 404 al consultarlo', async () => {
    const res = await request(app).delete('/api/servicios/5').set(ADMIN);

    expect(res.status).toBe(204);
    expect((await request(app).get('/api/servicios').set(LECTOR)).body).toHaveLength(4);
    esperarError(await request(app).get('/api/servicios/5').set(LECTOR), 404, 'NO_ENCONTRADO');
  });

  test('la fila no se borra: aparece con incluir_inactivos=true y activo en false', async () => {
    await request(app).delete('/api/servicios/5').set(ADMIN);

    const res = await request(app).get('/api/servicios').query({ incluir_inactivos: 'true' }).set(LECTOR);

    expect(res.body).toHaveLength(5);
    expect(res.body.find((servicio) => servicio.id === 5).activo).toBe(false);
  });

  test('404 · darlo de baja dos veces', async () => {
    await request(app).delete('/api/servicios/5').set(ADMIN);

    esperarError(await request(app).delete('/api/servicios/5').set(ADMIN), 404, 'NO_ENCONTRADO');
  });

  test('409 · regla de negocio: no se da de baja un servicio con citas pendientes', async () => {
    bd.ponerCitasPendientes({ servicioId: 1 });

    const res = await request(app).delete('/api/servicios/1').set(ADMIN);

    esperarError(res, 409, 'CONFLICTO');
    expect(res.body.mensaje).toMatch(/citas generadas pendientes \(1\)/);
    expect((await request(app).get('/api/servicios/1').set(LECTOR)).status).toBe(200);
  });
});
