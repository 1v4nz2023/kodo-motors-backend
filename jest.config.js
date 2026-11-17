module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/services/{servicios,encuestas,repuestos}.service.js',
    'src/models/{servicio,encuesta,repuesto}.model.js',
    'src/validators/{servicios,encuestas,repuestos}.validators.js',
  ],
};
