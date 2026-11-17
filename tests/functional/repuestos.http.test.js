jest.mock('../../src/repositories/repuestos.repository');

const request = require('supertest');
const app = require('../../src/app');
const repositorio = require('../../src/repositories/repuestos.repository');
const esperarError = require('../helpers/esperar-error');

const datosValidos = {
  codigo: 'FIL-CX5-01',
  nombre: 'Filtro de aceite',
  modelo_compatible: 'CX-5',
  stock: 10,
  stock_minimo: 3,
  precio: 89.9,
  ubicacion: 'A-01',
};

describe('API de repuestos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('POST crea un repuesto válido y normaliza el código', async () => {
    repositorio.findByCodigo.mockResolvedValue(null);
    repositorio.create.mockImplementation(async (datos) => ({ id: 6, ...datos, activo: true }));

    const respuesta = await request(app)
      .post('/api/repuestos')
      .send({ ...datosValidos, codigo: 'fil-cx5-01' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({ id: 6, codigo: 'FIL-CX5-01' });
    expect(repositorio.create).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'FIL-CX5-01' })
    );
  });

  test.each([
    ['código corto', { codigo: 'x' }, 'codigo'],
    ['modelo desconocido', { modelo_compatible: 'Toyota' }, 'modelo_compatible'],
    ['stock negativo', { stock: -1 }, 'stock'],
    ['precio cero', { precio: 0 }, 'precio'],
    ['precio con tres decimales', { precio: 10.999 }, 'precio'],
  ])('POST rechaza %s', async (_caso, cambio, campo) => {
    const respuesta = await request(app)
      .post('/api/repuestos')
      .send({ ...datosValidos, ...cambio });

    esperarError(respuesta, 400);
    expect(respuesta.body.errores).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo })])
    );
    expect(repositorio.create).not.toHaveBeenCalled();
  });

  test('POST responde 409 cuando el código ya existe', async () => {
    repositorio.findByCodigo.mockResolvedValue({ id: 2, activo: true });

    const respuesta = await request(app).post('/api/repuestos').send(datosValidos);

    esperarError(respuesta, 409);
    expect(repositorio.create).not.toHaveBeenCalled();
  });

  test('GET por id responde 400 para un id inválido', async () => {
    const respuesta = await request(app).get('/api/repuestos/abc');

    esperarError(respuesta, 400);
    expect(repositorio.findById).not.toHaveBeenCalled();
  });

  test('PUT rechaza un cuerpo vacío', async () => {
    repositorio.findById.mockResolvedValue({ id: 6, ...datosValidos, activo: true });

    const respuesta = await request(app).put('/api/repuestos/6').send({});

    esperarError(respuesta, 400);
    expect(repositorio.update).not.toHaveBeenCalled();
  });

  test('DELETE rechaza la baja cuando todavía existe stock', async () => {
    repositorio.findById.mockResolvedValue({ id: 6, ...datosValidos, stock: 2 });

    const respuesta = await request(app).delete('/api/repuestos/6');

    esperarError(respuesta, 400);
    expect(respuesta.body.mensaje).toContain('stock disponible');
    expect(repositorio.remove).not.toHaveBeenCalled();
  });

  test('DELETE responde 204 cuando el stock es cero', async () => {
    repositorio.findById.mockResolvedValue({ id: 6, ...datosValidos, stock: 0 });
    repositorio.remove.mockResolvedValue(true);

    const respuesta = await request(app).delete('/api/repuestos/6');

    expect(respuesta.status).toBe(204);
    expect(repositorio.remove).toHaveBeenCalledWith(6);
  });
});
