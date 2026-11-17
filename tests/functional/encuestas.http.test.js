jest.mock('../../src/repositories/encuestas.repository');

const request = require('supertest');
const app = require('../../src/app');
const repositorio = require('../../src/repositories/encuestas.repository');
const esperarError = require('../helpers/esperar-error');

const datosValidos = {
  orden_id: 20,
  puntuacion: 5,
  recomendaria: true,
  comentario: 'Excelente atención',
};

describe('API de encuestas', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('POST crea una encuesta para una orden entregada', async () => {
    repositorio.findOrdenServicioById.mockResolvedValue({ id: 20, estado: 'entregado' });
    repositorio.findByOrdenId.mockResolvedValue(null);
    repositorio.create.mockResolvedValue({ id: 4, ...datosValidos, activo: true });

    const respuesta = await request(app).post('/api/encuestas').send(datosValidos);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({ id: 4, puntuacion: 5 });
  });

  test.each([0, 6])('POST rechaza la puntuación fuera del límite %i', async (puntuacion) => {
    const respuesta = await request(app)
      .post('/api/encuestas')
      .send({ ...datosValidos, puntuacion });

    esperarError(respuesta, 400);
    expect(respuesta.body.errores).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'puntuacion' })])
    );
    expect(repositorio.findOrdenServicioById).not.toHaveBeenCalled();
  });

  test('POST rechaza recomendaria con un tipo inválido', async () => {
    const respuesta = await request(app)
      .post('/api/encuestas')
      .send({ ...datosValidos, recomendaria: 'quizas' });

    esperarError(respuesta, 400);
    expect(respuesta.body.errores).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'recomendaria' })])
    );
  });

  test('POST responde 404 cuando la orden no existe', async () => {
    repositorio.findOrdenServicioById.mockResolvedValue(null);

    const respuesta = await request(app).post('/api/encuestas').send(datosValidos);

    esperarError(respuesta, 404);
  });

  test('POST responde 400 cuando la orden todavía no fue entregada', async () => {
    repositorio.findOrdenServicioById.mockResolvedValue({ id: 20, estado: 'en_proceso' });

    const respuesta = await request(app).post('/api/encuestas').send(datosValidos);

    esperarError(respuesta, 400);
    expect(respuesta.body.mensaje).toContain('entregado');
  });

  test('POST responde 409 cuando la orden ya tiene encuesta', async () => {
    repositorio.findOrdenServicioById.mockResolvedValue({ id: 20, estado: 'entregado' });
    repositorio.findByOrdenId.mockResolvedValue({ id: 8, activo: true });

    const respuesta = await request(app).post('/api/encuestas').send(datosValidos);

    esperarError(respuesta, 409);
    expect(repositorio.create).not.toHaveBeenCalled();
  });

  test('PUT rechaza un cuerpo vacío', async () => {
    repositorio.findById.mockResolvedValue({ id: 4, ...datosValidos, activo: true });

    const respuesta = await request(app).put('/api/encuestas/4').send({});

    esperarError(respuesta, 400);
    expect(repositorio.update).not.toHaveBeenCalled();
  });

  test('PUT impide modificar orden_id', async () => {
    const respuesta = await request(app)
      .put('/api/encuestas/4')
      .send({ orden_id: 21 });

    esperarError(respuesta, 400);
    expect(respuesta.body.errores).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'orden_id' })])
    );
  });

  test('DELETE responde 204 cuando realiza la baja lógica', async () => {
    repositorio.findById.mockResolvedValue({ id: 4, activo: true });
    repositorio.remove.mockResolvedValue(true);

    const respuesta = await request(app).delete('/api/encuestas/4');

    expect(respuesta.status).toBe(204);
    expect(repositorio.remove).toHaveBeenCalledWith(4);
  });
});
