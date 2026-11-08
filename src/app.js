// Aplicación Express: middlewares globales, rutas de los seis recursos y manejo de errores (Semana 10)
const express = require('express');
const cors = require('cors');
const rutas = require('./routes');
const trazabilidad = require('./middlewares/trazabilidad');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/manejarErrores');

const app = express();

// 1. Trazabilidad: genera idTraza y cabecera X-Request-Id (Slide 21, 31)
app.use(trazabilidad);

// CORS
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// 2. Lee el cuerpo con límite de 10 KB (Slide 21, 25)
app.use(express.json({ limit: '10kb' }));

app.get('/', (req, res) => {
  res.json({
    proyecto: 'Kodo Motors API',
    modulos: [
      '/api/sedes',
      '/api/servicios',
      '/api/catalogo',
      '/api/reservas',
      '/api/repuestos',
      '/api/encuestas',
      '/api/vehiculos',
    ],
    salud: '/api/salud',
  });
});

// 3.  Rutas principales 
app.use('/api', rutas);

// 4. Ruta no encontrada: delega a next(new NotFoundError(...)) (Slide 21, 33)
app.use(rutaNoEncontrada);

// 5. Manejador de errores central: SIEMPRE al final con 4 parámetros (Slide 20, 21, 26)
app.use(manejarErrores);

module.exports = app;
