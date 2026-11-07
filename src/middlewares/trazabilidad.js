// Middleware de trazabilidad: asigna un idTraza único a cada petición (Semana 10, Slide 31)
const { randomUUID } = require('crypto');

module.exports = (req, res, next) => {
  req.idTraza = randomUUID().slice(0, 8);
  res.setHeader('X-Request-Id', req.idTraza);
  next();
};
