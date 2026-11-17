// Aplicación Express: middlewares globales, rutas de los seis recursos y manejo de errores (Semana 10)
const express = require('express');
const cors = require('cors');
const trazabilidad = require('./middlewares/trazabilidad');
const rutas = require('./routes');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/manejarErrores');

const app = express();

// 1. Trazabilidad: asigna idTraza y cabecera X-Request-Id a todas las solicitudes
app.use(trazabilidad);

// 2. CORS y parsing de cuerpo JSON con límite de seguridad (10 KB)
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
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

// 3. Montaje de rutas de la API
app.use('/api', rutas);

// 4. Ruta no encontrada: delega al handler central con un 404 estandarizado
app.use(rutaNoEncontrada);

// 5. Manejador de errores centralizado (4 parámetros, siempre al final)
app.use(manejarErrores);

module.exports = app;
