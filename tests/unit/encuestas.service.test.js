jest.mock('../../src/repositories/encuestas.repository');

const repositorio = require('../../src/repositories/encuestas.repository');
const servicio = require('../../src/services/encuestas.service');

const datosValidos = {
  orden_id: 20,
  puntuacion: 5,
  recomendaria: true,
  comentario: 'Excelente atención',
};

describe('Servicio de encuestas', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('crea una encuesta para una orden entregada', async () => {
    repositorio.findOrdenServicioById.mockResolvedValue({ id: 20, estado: ' ENTREGADO ' });
    repositorio.findByOrdenId.mockResolvedValue(null);
    repositorio.create.mockResolvedValue({ id: 3, ...datosValidos });

    await expect(servicio.crear(datosValidos)).resolves.toMatchObject({ id: 3 });
    expect(repositorio.create).toHaveBeenCalledWith(datosValidos);
  });

  test.each([0, 6])('rechaza la puntuación fuera de rango %i', async (puntuacion) => {
    await expect(servicio.crear({ ...datosValidos, puntuacion })).rejects.toMatchObject({
      status: 400,
    });
    expect(repositorio.findOrdenServicioById).not.toHaveBeenCalled();
  });

  test('rechaza recomendaria cuando no es booleano ni 0/1', async () => {
    await expect(
      servicio.crear({ ...datosValidos, recomendaria: 'quizas' })
    ).rejects.toMatchObject({ status: 400 });
    expect(repositorio.create).not.toHaveBeenCalled();
  });

  test('responde 404 cuando la orden no existe', async () => {
    repositorio.findOrdenServicioById.mockResolvedValue(null);

    await expect(servicio.crear(datosValidos)).rejects.toMatchObject({ status: 404 });
  });

  test.each(['pendiente', 'en_proceso', 'listo'])('rechaza una orden en estado %s', async (estado) => {
    repositorio.findOrdenServicioById.mockResolvedValue({ id: 20, estado });

    await expect(servicio.crear(datosValidos)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('entregado'),
    });
  });

  test('rechaza una segunda encuesta para la misma orden', async () => {
    repositorio.findOrdenServicioById.mockResolvedValue({ id: 20, estado: 'entregado' });
    repositorio.findByOrdenId.mockResolvedValue({ id: 7, activo: true });

    await expect(servicio.crear(datosValidos)).rejects.toMatchObject({ status: 409 });
    expect(repositorio.create).not.toHaveBeenCalled();
  });

  test('rechaza una actualización vacía', async () => {
    repositorio.findById.mockResolvedValue({ id: 3, puntuacion: 5, recomendaria: true });

    await expect(servicio.actualizar(3, {})).rejects.toMatchObject({ status: 400 });
    expect(repositorio.update).not.toHaveBeenCalled();
  });

  test('realiza el borrado lógico de una encuesta existente', async () => {
    repositorio.findById.mockResolvedValue({ id: 3, activo: true });
    repositorio.remove.mockResolvedValue(true);

    await expect(servicio.eliminar(3)).resolves.toBeUndefined();
    expect(repositorio.remove).toHaveBeenCalledWith(3);
  });
});
