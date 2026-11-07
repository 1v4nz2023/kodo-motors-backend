// Envoltorio para funciones asíncronas en controladores y rutas (Semana 10, Slide 22)
// Captura cualquier rechazo de promesa y lo delega a next(error)
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
