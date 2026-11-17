// Flujos completos (Semana 11, Slide 32): crear → consultar → actualizar → eliminar → ya no existe.
// Prueban que las piezas se encadenan; cada paso también tiene su prueba corta en sedes y servicios.
const {
  request, app, bd, LECTOR, ADMIN, esperarError, reiniciarDatos,
} = require('../helpers/api');

beforeEach(reiniciarDatos);

test('ciclo de vida de una sede: se abre, cambia de horario y se da de baja', async () => {
  // Crear
  const creada = await request(app).post('/api/sedes').set(ADMIN).send({
    nombre: 'Kodo Miraflores', distrito: 'Miraflores', direccion: 'Av. Larco 345',
    telefono: '014478899', hora_apertura: '09:00', hora_cierre: '19:00', atiende_domingo: true,
  });
  expect(creada.status).toBe(201);
  const id = creada.body.id;

  // Consultar
  const consultada = await request(app).get(`/api/sedes/${id}`).set(LECTOR);
  expect(consultada.body).toMatchObject({ nombre: 'Kodo Miraflores', hora_cierre: '19:00:00', atiende_domingo: true });

  // Aparece al filtrar por su distrito
  const delDistrito = await request(app).get('/api/sedes').query({ distrito: 'Miraflores' }).set(LECTOR);
  expect(delDistrito.body.map((sede) => sede.id)).toEqual([id]);

  // Actualizar
  const actualizada = await request(app).put(`/api/sedes/${id}`).set(ADMIN)
    .send({ hora_cierre: '20:00', atiende_domingo: false });
  expect(actualizada.status).toBe(200);
  expect(actualizada.body).toMatchObject({ hora_apertura: '09:00:00', hora_cierre: '20:00:00', atiende_domingo: false });

  // Eliminar
  expect((await request(app).delete(`/api/sedes/${id}`).set(ADMIN)).status).toBe(204);

  // Ya no existe para la API
  esperarError(await request(app).get(`/api/sedes/${id}`).set(LECTOR), 404, 'NO_ENCONTRADO');
  esperarError(await request(app).put(`/api/sedes/${id}`).set(ADMIN).send({ telefono: '987654321' }), 404, 'NO_ENCONTRADO');

  // Su nombre queda reservado: el historial de Kodo no se pisa
  const repetida = await request(app).post('/api/sedes').set(ADMIN).send({
    nombre: 'Kodo Miraflores', distrito: 'Miraflores', direccion: 'Av. Pardo 100',
    telefono: '014478800', hora_apertura: '09:00', hora_cierre: '19:00',
  });
  esperarError(repetida, 409, 'CONFLICTO');
});

test('ciclo de vida de un servicio: se publica, sube de precio y se retira', async () => {
  const creado = await request(app).post('/api/servicios').set(ADMIN).send({
    nombre: 'Pulido de faros', categoria: 'planchado_pintura', precio: 89.9, duracion_min: 40,
  });
  expect(creado.status).toBe(201);
  const id = creado.body.id;

  expect((await request(app).get(`/api/servicios/${id}`).set(LECTOR)).body)
    .toMatchObject({ nombre: 'Pulido de faros', precio: 89.9, descripcion: null });

  const actualizado = await request(app).put(`/api/servicios/${id}`).set(ADMIN)
    .send({ precio: 99.9, descripcion: 'Incluye sellado UV' });
  expect(actualizado.body).toMatchObject({ precio: 99.9, descripcion: 'Incluye sellado UV', duracion_min: 40 });

  expect((await request(app).delete(`/api/servicios/${id}`).set(ADMIN)).status).toBe(204);

  esperarError(await request(app).get(`/api/servicios/${id}`).set(LECTOR), 404, 'NO_ENCONTRADO');
  expect((await request(app).get('/api/servicios').set(LECTOR)).body).toHaveLength(5);
});

test('operación de negocio: un servicio con citas pendientes no se retira hasta que se atienden', async () => {
  // El Mantenimiento 10 000 km tiene 2 citas confirmadas
  bd.ponerCitasPendientes({ servicioId: 1, cantidad: 2 });

  const bloqueado = await request(app).delete('/api/servicios/1').set(ADMIN);
  esperarError(bloqueado, 409, 'CONFLICTO');

  // Mientras tanto se sigue ofreciendo y se puede editar
  expect((await request(app).get('/api/servicios/1').set(LECTOR)).status).toBe(200);
  expect((await request(app).put('/api/servicios/1').set(ADMIN).send({ precio: 390 })).status).toBe(200);

  // Las citas se atienden o se cancelan
  bd.ponerCitasPendientes({ servicioId: 1, cantidad: 0 });

  expect((await request(app).delete('/api/servicios/1').set(ADMIN)).status).toBe(204);
  esperarError(await request(app).get('/api/servicios/1').set(LECTOR), 404, 'NO_ENCONTRADO');
});
