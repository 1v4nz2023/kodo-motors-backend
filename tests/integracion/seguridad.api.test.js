// Integración de seguridad: ninguna ruta de sedes ni de servicios responde sin credencial (401)
// y ninguna escritura se ejecuta sin el rol admin (403). Semana 11, Slide 49: "Seguridad → 401 y 403".
const {
  request, app, LECTOR, RECEPCION, ADMIN, LLAVE_DE_PRUEBA, esperarError, reiniciarDatos,
} = require('../helpers/api');

const sedeValida = {
  nombre: 'Kodo San Isidro', distrito: 'San Isidro', direccion: 'Av. Javier Prado Este 1234',
  telefono: '014447788', hora_apertura: '08:00', hora_cierre: '18:00',
};
const servicioValido = { nombre: 'Cambio de aceite', categoria: 'mantenimiento', precio: 180, duracion_min: 45 };

// Todas las rutas de los dos recursos: [método, ruta, cuerpo]. Las filas tienen SIEMPRE 3 valores:
// si una fila fuera más corta, Jest pasaría su callback done en el lugar del cuerpo.
const LECTURAS = [
  ['get', '/api/sedes', null],
  ['get', '/api/sedes/1', null],
  ['get', '/api/servicios', null],
  ['get', '/api/servicios/1', null],
];
const ESCRITURAS = [
  ['post', '/api/sedes', sedeValida],
  ['put', '/api/sedes/1', { telefono: '987654321' }],
  ['delete', '/api/sedes/3', null],
  ['post', '/api/servicios', servicioValido],
  ['put', '/api/servicios/1', { precio: 400 }],
  ['delete', '/api/servicios/5', null],
];
const TODAS = [...LECTURAS, ...ESCRITURAS];

const enviar = (metodo, ruta, cuerpo, cabeceras = {}) => {
  const peticion = request(app)[metodo](ruta).set(cabeceras);
  return cuerpo ? peticion.send(cuerpo) : peticion;
};

const contar = async (recurso) =>
  (await request(app).get(`/api/${recurso}`).query({ incluir_inactivos: 'true' }).set(LECTOR)).body;

beforeEach(reiniciarDatos);

describe('401 · sin credencial no se entra a ninguna ruta', () => {
  test.each(TODAS)('%s %s sin x-api-key', async (metodo, ruta, cuerpo) => {
    const res = await enviar(metodo, ruta, cuerpo);

    esperarError(res, 401, 'NO_AUTENTICADO');
    expect(res.body.mensaje).toBe('Falta x-api-key');
  });

  test.each(TODAS)('%s %s con una llave equivocada', async (metodo, ruta, cuerpo) => {
    const res = await enviar(metodo, ruta, cuerpo, { 'x-api-key': 'llave-inventada', 'x-rol': 'admin' });

    esperarError(res, 401, 'NO_AUTENTICADO');
    expect(res.body.mensaje).toBe('Llave inválida');
  });

  test('la llave que antes estaba escrita en el código ya no abre la API', async () => {
    const res = await request(app).get('/api/sedes').set({ 'x-api-key': 'kodo-api-key-2026' });

    esperarError(res, 401, 'NO_AUTENTICADO');
  });

  test('la respuesta 401 no revela la llave real ni datos del recurso', async () => {
    const res = await request(app).get('/api/sedes/1').set({ 'x-api-key': 'llave-inventada' });

    expect(JSON.stringify(res.body)).not.toContain(LLAVE_DE_PRUEBA);
    expect(JSON.stringify(res.body)).not.toContain('Surquillo');
  });
});

describe('403 · la escritura exige el rol admin', () => {
  test.each(ESCRITURAS)('%s %s con rol recepcion', async (metodo, ruta, cuerpo) => {
    const res = await enviar(metodo, ruta, cuerpo, RECEPCION);

    esperarError(res, 403, 'SIN_PERMISO');
    expect(res.body.mensaje).toBe('Requiere rol: admin');
  });

  test.each(ESCRITURAS)('%s %s con llave válida pero sin rol', async (metodo, ruta, cuerpo) => {
    esperarError(await enviar(metodo, ruta, cuerpo, LECTOR), 403, 'SIN_PERMISO');
  });

  test('un intento rechazado no modifica nada', async () => {
    for (const [metodo, ruta, cuerpo] of ESCRITURAS) await enviar(metodo, ruta, cuerpo, RECEPCION);

    const sedes = await contar('sedes');
    const servicios = await contar('servicios');
    expect(sedes).toHaveLength(3);
    expect(sedes.every((sede) => sede.activa)).toBe(true);
    expect(sedes[0].telefono).toBe('014445566');
    expect(servicios).toHaveLength(5);
    expect(servicios.every((servicio) => servicio.activo)).toBe(true);
    expect(servicios[0].precio).toBe(380);
  });
});

describe('200 · con la credencial correcta', () => {
  test.each(LECTURAS)('%s %s: para leer basta la llave, sin rol', async (metodo, ruta) => {
    expect((await enviar(metodo, ruta, null, LECTOR)).status).toBe(200);
  });

  test.each(LECTURAS)('%s %s: el rol recepcion también puede leer', async (metodo, ruta) => {
    expect((await enviar(metodo, ruta, null, RECEPCION)).status).toBe(200);
  });

  test.each([
    ['post', '/api/sedes', sedeValida, 201],
    ['put', '/api/sedes/1', { telefono: '987654321' }, 200],
    ['delete', '/api/sedes/3', null, 204],
    ['post', '/api/servicios', servicioValido, 201],
    ['put', '/api/servicios/1', { precio: 400 }, 200],
    ['delete', '/api/servicios/5', null, 204],
  ])('%s %s: el rol admin puede escribir', async (metodo, ruta, cuerpo, esperado) => {
    expect((await enviar(metodo, ruta, cuerpo, ADMIN)).status).toBe(esperado);
  });
});

describe('orden de las comprobaciones: 401 → 403 → 400 → 404', () => {
  test('sin credencial y con datos inválidos responde 401, no 400', async () => {
    esperarError(await request(app).post('/api/servicios').send({ precio: -1 }), 401, 'NO_AUTENTICADO');
  });

  test('sin credencial, un id inexistente responde 401: no revela si el recurso existe', async () => {
    esperarError(await request(app).get('/api/sedes/999'), 401, 'NO_AUTENTICADO');
  });

  test('sin el rol y con datos inválidos responde 403, no 400', async () => {
    esperarError(await request(app).post('/api/sedes').set(RECEPCION).send({}), 403, 'SIN_PERMISO');
  });

  test('sin el rol, un id inexistente responde 403, no 404', async () => {
    esperarError(await request(app).delete('/api/servicios/999').set(RECEPCION), 403, 'SIN_PERMISO');
  });
});

describe('rutas que no existen', () => {
  test('404 · ruta desconocida, con el mismo contrato de error', async () => {
    const res = await request(app).get('/api/sucursales').set(LECTOR);

    esperarError(res, 404, 'NO_ENCONTRADO');
    expect(res.body.ruta).toBe('GET /api/sucursales');
  });

  test('404 · método no implementado en un recurso (PATCH)', async () => {
    esperarError(await request(app).patch('/api/sedes/1').set(ADMIN).send({ telefono: '987654321' }), 404, 'NO_ENCONTRADO');
  });
});
