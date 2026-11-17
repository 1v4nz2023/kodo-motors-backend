jest.mock('../../src/repositories/servicios.repository');
jest.mock('../../src/repositories/reserva.repository');

const request = require('supertest');
const app = require('../../src/app');
const repositorio = require('../../src/repositories/servicios.repository');
const repositorioReservas = require('../../src/repositories/reserva.repository');
const esperarError = require('../helpers/esperar-error');

const datosValidos = {
  nombre: 'Alineamiento computarizado',
  categoria: 'neumaticos',
  descripcion: 'Alineamiento de las cuatro ruedas',
  precio: 120,
  duracion_min: 60,
};

describe('API de servicios', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test.each([15, 480])('POST acepta la duración límite %i', async (duracion_min) => {
    const datos = { ...datosValidos, duracion_min };
    repositorio.buscarPorNombre.mockResolvedValue(null);
    repositorio.crear.mockResolvedValue(9);
    repositorio.buscarPorId.mockResolvedValue({ id: 9, ...datos, activo: true });

    const respuesta = await request(app).post('/api/servicios').send(datos);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({ id: 9, duracion_min });
  });

  test.each([14, 481])('POST rechaza la duración fuera del límite %i', async (duracion_min) => {
    const respuesta = await request(app)
      .post('/api/servicios')
      .send({ ...datosValidos, duracion_min });

    esperarError(respuesta, 400);
    expect(respuesta.body.errores).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'duracion_min' })])
    );
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  test('POST responde 409 cuando el nombre ya existe', async () => {
    repositorio.buscarPorNombre.mockResolvedValue({ id: 2, activo: true });

    const respuesta = await request(app).post('/api/servicios').send(datosValidos);

    esperarError(respuesta, 409);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  test('GET por id responde 404 cuando no existe', async () => {
    repositorio.buscarPorId.mockResolvedValue(undefined);

    const respuesta = await request(app).get('/api/servicios/999');

    esperarError(respuesta, 404);
  });

  test('PUT rechaza un cuerpo vacío', async () => {
    const respuesta = await request(app).put('/api/servicios/2').send({});

    esperarError(respuesta, 400);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  test('DELETE responde 409 cuando existen citas pendientes', async () => {
    repositorioReservas.contarCitasPendientesDeServicio.mockResolvedValue(1);

    const respuesta = await request(app).delete('/api/servicios/2');

    esperarError(respuesta, 409);
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });

  test('DELETE responde 204 cuando realiza la baja lógica', async () => {
    repositorioReservas.contarCitasPendientesDeServicio.mockResolvedValue(0);
    repositorio.eliminar.mockResolvedValue(true);

    const respuesta = await request(app).delete('/api/servicios/2');

    expect(respuesta.status).toBe(204);
    expect(respuesta.text).toBe('');
  });
});
