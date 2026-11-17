jest.mock('../../src/repositories/repuestos.repository');

const repositorio = require('../../src/repositories/repuestos.repository');
const servicio = require('../../src/services/repuestos.service');

const datosValidos = {
  codigo: 'FIL-CX5-01',
  nombre: 'Filtro de aceite',
  modelo_compatible: 'CX-5',
  stock: 10,
  stock_minimo: 3,
  precio: 89.9,
  ubicacion: 'A-01',
};

describe('Servicio de repuestos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('crea un repuesto válido cuando el código está libre', async () => {
    repositorio.findByCodigo.mockResolvedValue(null);
    repositorio.create.mockResolvedValue({ id: 6, ...datosValidos });

    await expect(servicio.crear(datosValidos)).resolves.toMatchObject({ id: 6 });
    expect(repositorio.create).toHaveBeenCalledWith(datosValidos);
  });

  test.each([
    [{ codigo: 'x' }, 'codigo'],
    [{ precio: 0 }, 'precio'],
    [{ precio: 10.999 }, 'precio'],
    [{ stock: -1 }, 'stock'],
    [{ modelo_compatible: 'Toyota' }, 'modelo_compatible'],
    [{ ubicacion: 'X'.repeat(21) }, 'ubicacion'],
  ])('rechaza datos inválidos del campo %s', async (cambio) => {
    await expect(servicio.crear({ ...datosValidos, ...cambio })).rejects.toMatchObject({
      status: 400,
    });
    expect(repositorio.create).not.toHaveBeenCalled();
  });

  test.each([
    [{ id: 2, activo: true }, 'Ya existe'],
    [{ id: 2, activo: false }, 'dado de baja'],
  ])('rechaza un código ocupado', async (existente, mensaje) => {
    repositorio.findByCodigo.mockResolvedValue(existente);

    await expect(servicio.crear(datosValidos)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining(mensaje),
    });
    expect(repositorio.create).not.toHaveBeenCalled();
  });

  test('rechaza una actualización vacía', async () => {
    repositorio.findById.mockResolvedValue({ id: 6, ...datosValidos });

    await expect(servicio.actualizar(6, {})).rejects.toMatchObject({ status: 400 });
    expect(repositorio.update).not.toHaveBeenCalled();
  });

  test('impide la baja de un repuesto con stock', async () => {
    repositorio.findById.mockResolvedValue({ id: 6, ...datosValidos, stock: 2 });

    await expect(servicio.eliminar(6)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('stock disponible'),
    });
    expect(repositorio.remove).not.toHaveBeenCalled();
  });

  test('realiza el borrado lógico cuando el stock es cero', async () => {
    repositorio.findById.mockResolvedValue({ id: 6, ...datosValidos, stock: 0 });
    repositorio.remove.mockResolvedValue(true);

    await expect(servicio.eliminar(6)).resolves.toBeUndefined();
    expect(repositorio.remove).toHaveBeenCalledWith(6);
  });

  test('responde 404 cuando el repuesto no existe', async () => {
    repositorio.findById.mockResolvedValue(null);

    await expect(servicio.obtenerPorId(999)).rejects.toMatchObject({ status: 404 });
  });
});
