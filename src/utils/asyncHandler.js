// asyncHandler: captura errores asíncronos y los envía a next(error) — Semana 10 (Slide 22)
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
