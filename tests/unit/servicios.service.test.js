jest.mock('../../src/repositories/servicios.repository');
jest.mock('../../src/repositories/reserva.repository');

const repositorio = require('../../src/repositories/servicios.repository');
const repositorioReservas = require('../../src/repositories/reserva.repository');
const servicio = require('../../src/services/servicios.service');

const datosValidos = {
  nombre: 'Alineamiento computarizado',
  categoria: 'neumaticos',
  descripcion: 'Alineamiento de las cuatro ruedas',
  precio: 120,
  duracion_min: 60,
};

describe('Servicio de servicios', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('crea un servicio válido y devuelve el registro creado', async () => {
    repositorio.buscarPorNombre.mockResolvedValue(null);
    repositorio.crear.mockResolvedValue(8);
    repositorio.buscarPorId.mockResolvedValue({ id: 8, ...datosValidos, activo: true });

    await expect(servicio.crearServicio(datosValidos)).resolves.toMatchObject({
      id: 8,
      nombre: datosValidos.nombre,
    });
    expect(repositorio.crear).toHaveBeenCalledWith(datosValidos);
  });

  test.each([14, 481])('rechaza la duración límite inválida %i', async (duracion_min) => {
    await expect(
      servicio.crearServicio({ ...datosValidos, duracion_min })
    ).rejects.toMatchObject({ status: 400 });
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  test.each([
    [{ id: 2, activo: true }, 'Ya existe'],
    [{ id: 2, activo: false }, 'dado de baja'],
  ])('rechaza un nombre ocupado', async (existente, mensaje) => {
    repositorio.buscarPorNombre.mockResolvedValue(existente);

    await expect(servicio.crearServicio(datosValidos)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining(mensaje),
    });
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  test('responde 404 cuando el servicio no existe', async () => {
    repositorio.buscarPorId.mockResolvedValue(undefined);

    await expect(servicio.buscarServicioPorId(999)).rejects.toMatchObject({ status: 404 });
  });

  test('impide la baja cuando hay citas pendientes', async () => {
    repositorioReservas.contarCitasPendientesDeServicio.mockResolvedValue(2);

    await expect(servicio.eliminarServicio(4)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('citas generadas pendientes'),
    });
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });

  test('responde 404 al eliminar un servicio inexistente', async () => {
    repositorioReservas.contarCitasPendientesDeServicio.mockResolvedValue(0);
    repositorio.eliminar.mockResolvedValue(false);

    await expect(servicio.eliminarServicio(999)).rejects.toMatchObject({ status: 404 });
  });
});
