function esperarError(respuesta, estadoEsperado) {
  expect(respuesta.status).toBe(estadoEsperado);
  expect(respuesta.body).toEqual(
    expect.objectContaining({ mensaje: expect.any(String) })
  );
}

module.exports = esperarError;
