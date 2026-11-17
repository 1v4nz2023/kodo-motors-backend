# Kodo Motors API · Encuestas y Repuestos

![Kodo Motors](assets/banner.png)

API REST de **Kodo Motors** (taller y venta de vehículos Mazda) con Node.js, Express y MySQL.
Este documento corresponde a la **Evidencia Evaluativa 3** del curso *Fundamentos de Desarrollo Back-End*
(UCAL) y documenta los servicios **Encuestas** y **Repuestos** del **equipo E2 (rama `G2-EE3`)**.

## Contenido

1. [Empresa aliada](#1-empresa-aliada)
2. [Equipo](#2-equipo)
3. [Tecnologías](#3-tecnologías)
4. [Estructura del proyecto](#4-estructura-del-proyecto)
5. [Instalación](#5-instalación)
6. [Ejecución](#6-ejecución)
7. [Variables de entorno](#7-variables-de-entorno)
8. [Endpoints](#8-endpoints)
9. [Pruebas](#9-pruebas)
10. [Incidencias detectadas](#10-incidencias-detectadas)

## 1. Empresa aliada

**Kodo Motors**, empresa limeña especializada en vehículos Mazda, con tres líneas de trabajo: venta de
vehículos, servicio de taller y venta de repuestos.

## 2. Equipo

| Integrante | Responsabilidad en la EE3 |
|---|---|
| Adso Martin Obregon Gutierrez | Semana 9 · validaciones |
| Iván Hermilio Mera Ibarguen | Semana 10 · manejo de errores |
| Lenin David Mamani Sarmiento | Semana 11 · pruebas |
| Sharmili Luzmer Soncco Lupa | Documentación |
| Geraldo Fair Jaramillo Florida (líder técnico) | Documentación · revisión y merge |
| Rodrigo Alonso | Documentación QA (reporte de pruebas) |

## 3. Tecnologías

| Tecnología | Uso |
|---|---|
| Node.js 18 o superior | Entorno de ejecución |
| Express 5 | Servidor HTTP y rutas |
| express-validator | Validación de datos de entrada |
| MySQL 8.4 (Docker) y `mysql2` | Base de datos relacional y conexión |
| `dotenv` y `cors` | Variables de entorno y CORS |
| nodemon | Reinicio automático en desarrollo |
| Postman | Pruebas manuales de los endpoints |

## 4. Estructura del proyecto

```text
src/
├── app.js                 # Express: middlewares globales, rutas y manejo de errores
├── server.js              # Arranque: prueba la conexión a MySQL y escucha el puerto
├── config/                # Conexión a MySQL (pool)
├── routes/                # Rutas por recurso
├── controllers/           # Reciben la petición y responden
├── services/              # Reglas de negocio
├── repositories/          # Consultas SQL
├── models/                # Validación y forma de cada recurso
├── validators/            # Reglas de express-validator
├── middlewares/           # manejarErrores.js y validarId.js
└── utils/                 # Utilidades compartidas
database/                  # 01_schema.sql y 02_seed.sql
postman/                   # Colección de Postman
assets/                    # Logo
```

## 5. Instalación

Requisitos: Node.js 18+, Docker Desktop abierto y Git.

```bash
git clone https://github.com/jcondori-ucal/kodo-motors-backend.git
cd kodo-motors-backend
git switch G2-EE3
npm install
cp .env.example .env
```

En Windows (cmd): `copy .env.example .env`. Luego se reemplaza cada texto del `.env` por el valor real.

## 6. Ejecución

```bash
docker compose up -d      # levanta MySQL (puerto 3307) y Adminer (puerto 8081)
npm run dev               # levanta la API en http://localhost:4000
```

Comprobación rápida: `GET http://localhost:4000/api/salud`.

| Comando | Para qué |
|---|---|
| `npm run dev` | API con reinicio automático |
| `npm start` | API sin nodemon |
| `npm test` | Ejecuta `test-suite.js` (sin necesidad de base de datos) |
| `npm run bd:levantar` · `bd:detener` | Levanta o detiene MySQL |
| `npm run bd:reiniciar` | Borra la base y la vuelve a crear desde `database/` |

## 7. Variables de entorno

El archivo `.env` **no se sube a GitHub**; solo se sube la plantilla `.env.example`, que contiene las claves:

`PORT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MYSQL_ROOT_PASSWORD`.

## 8. Endpoints

Base: `http://localhost:4000/api` · Formato: JSON · Persistencia: MySQL 8.4 (Docker).
Cada endpoint indica método, ruta, parámetros, cuerpo, ejemplo de respuesta exitosa, ejemplo de error y códigos HTTP.

### 8.1 Formato de error único

Toda respuesta de error, de cualquier endpoint, tiene esta forma:

```json
{
  "estado": 404,
  "tipo": "NO_ENCONTRADO",
  "mensaje": "Repuesto con ID 999 no encontrado en el inventario",
  "idTraza": "d221180f",
  "ruta": "GET /api/repuestos/999"
}
```

Si hay errores por campo se agrega `"errores": [ ... ]`. La cabecera `X-Request-Id` repite el `idTraza`.
Un error inesperado responde `500` con `"mensaje": "Error interno del servidor"` y **nunca** expone datos internos.

| Código | `tipo` | Cuándo |
|---|---|---|
| 200 | — | Consulta o actualización correcta |
| 201 | — | Registro creado |
| 204 | — | Baja lógica correcta (sin cuerpo) |
| 400 | `VALIDACION` | Campos faltantes o inválidos (trae `errores`) |
| 400 | `SOLICITUD_INVALIDA` | Id no numérico, o regla de negocio que impide la operación |
| 404 | `NO_ENCONTRADO` | El registro o la ruta no existen |
| 409 | `CONFLICTO` | Valor único repetido |
| 500 | `ERROR_INTERNO` | Error inesperado |

### 8.2 Repuestos · `/api/repuestos`

Piezas de repuesto y su stock. El `DELETE` es **borrado lógico**: la fila se conserva con `activo = false`.

| Método | Ruta | Parámetros | Cuerpo | Éxito | Errores |
|---|---|---|---|---|---|
| GET | `/api/repuestos` | `modelo_compatible`, `bajo_stock=true`, `incluir_inactivos=true` (opcionales) | — | 200 lista | — |
| GET | `/api/repuestos/:id` | `id` entero positivo | — | 200 objeto | 400 id inválido · 404 |
| POST | `/api/repuestos` | — | ver abajo | 201 objeto | 400 `VALIDACION` · 409 código repetido |
| PUT | `/api/repuestos/:id` | `id` | cualquier campo de la tabla | 200 objeto | 400 · 404 · 409 |
| DELETE | `/api/repuestos/:id` | `id` | — | 204 | 400 con stock · 404 |

**Cuerpo de `POST`:**

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `codigo` | texto | sí | mínimo 3 caracteres; se guarda en mayúsculas; único |
| `nombre` | texto | sí | no vacío |
| `modelo_compatible` | texto | sí | uno de: `Mazda2`, `Mazda3`, `CX-3`, `CX-30`, `CX-5`, `CX-50`, `CX-90`, `BT-50`, `MX-5`, `Todos` |
| `precio` | número | sí | mayor a 0 |
| `stock` | entero | no (0) | mayor o igual a 0 |
| `stock_minimo` | entero | no (5) | mayor o igual a 0 |
| `ubicacion` | texto | no | — |

`activo` **no se puede enviar**: la baja solo se hace con `DELETE`.

#### Ejemplos

**GET `/api/repuestos/1` → 200**

```json
{ "id": 1, "codigo": "FIL-001", "nombre": "Filtro de aceite", "modeloCompatible": "Mazda3",
  "stock": 0, "stockMinimo": 5, "precio": 25.5, "ubicacion": "A-1", "activo": true,
  "alertaBajoStock": true }
```

> **Importante:** el cuerpo que se **envía** usa `modelo_compatible` y `stock_minimo` (snake_case), pero la
> respuesta devuelve `modeloCompatible` y `stockMinimo` (camelCase) y agrega `alertaBajoStock`
> (`true` cuando `stock` es menor o igual a `stockMinimo`).

**POST `/api/repuestos` → 201**

```json
// cuerpo enviado
{ "codigo": "FIL-002", "nombre": "Filtro de aire", "modelo_compatible": "CX-5", "stock": 10, "precio": 40 }
// respuesta
{ "id": 2, "codigo": "FIL-002", "nombre": "Filtro de aire", "modeloCompatible": "CX-5",
  "stock": 10, "stockMinimo": 5, "precio": 40, "ubicacion": null, "activo": true,
  "alertaBajoStock": false }
```

**POST con cuerpo vacío → 400 `VALIDACION`**

```json
{ "estado": 400, "tipo": "VALIDACION", "mensaje": "Datos de repuesto inválidos",
  "idTraza": "75d8c1e2", "ruta": "POST /api/repuestos",
  "errores": [
    "El campo \"codigo\" es obligatorio y debe tener al menos 3 caracteres",
    "El campo \"nombre\" es obligatorio y no puede estar vacío",
    "El campo \"modelo_compatible\" debe ser uno de: Mazda2, Mazda3, CX-3, CX-30, CX-5, CX-50, CX-90, BT-50, MX-5, Todos",
    "El campo \"precio\" es obligatorio y debe ser un número mayor a 0"
  ] }
```

**POST con código repetido → 409**

```json
{ "estado": 409, "tipo": "CONFLICTO",
  "mensaje": "Ya existe un repuesto registrado con el código \"FIL-001\"",
  "idTraza": "e3cdb4a4", "ruta": "POST /api/repuestos" }
```

**GET `/api/repuestos/abc` → 400 `SOLICITUD_INVALIDA`**

```json
{ "estado": 400, "tipo": "SOLICITUD_INVALIDA", "mensaje": "El id debe ser un número entero positivo",
  "idTraza": "24e8a900", "ruta": "GET /api/repuestos/abc" }
```

**DELETE `/api/repuestos/1` → 204** (sin cuerpo).
**Regla de negocio:** si el repuesto todavía tiene `stock` mayor a 0, responde **400** y no lo da de baja.

### 8.3 Encuestas · `/api/encuestas`

Encuesta de satisfacción de una orden de servicio. Una orden solo admite **una** encuesta y debe estar **entregada**.
El `DELETE` es borrado lógico.

| Método | Ruta | Parámetros | Cuerpo | Éxito | Errores |
|---|---|---|---|---|---|
| GET | `/api/encuestas` | `puntuacion`, `recomendaria`, `incluir_inactivos=true` (opcionales) | — | 200 lista | — |
| GET | `/api/encuestas/:id` | `id` entero positivo | — | 200 objeto | 400 · 404 |
| POST | `/api/encuestas` | — | ver abajo | 201 objeto | 400 · 404 orden · 409 |
| PUT | `/api/encuestas/:id` | `id` | `puntuacion`, `recomendaria`, `comentario` | 200 objeto | 400 · 404 |
| DELETE | `/api/encuestas/:id` | `id` | — | 204 | 404 |

**Cuerpo de `POST`:**

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `orden_id` | entero | sí | positivo; la orden debe existir y estar en estado `entregado` |
| `puntuacion` | entero | sí | de 1 a 5 |
| `recomendaria` | booleano | sí | `true/false` o `1/0` |
| `comentario` | texto | no | máximo 300 caracteres |

#### Ejemplos

**POST `/api/encuestas` → 201**

```json
// cuerpo enviado
{ "orden_id": 10, "puntuacion": 4, "recomendaria": true, "comentario": "Buen servicio" }
// respuesta
{ "id": 2, "ordenId": 10, "puntuacion": 4, "recomendaria": true, "comentario": "Buen servicio",
  "createdAt": "2026-11-16T19:40:00.000Z", "activo": true }
```

> **Importante:** se envía `orden_id` (snake_case) y la respuesta devuelve `ordenId` (camelCase) y `createdAt`.

**POST con puntuación 9 → 400 `VALIDACION`**

```json
{ "estado": 400, "tipo": "VALIDACION", "mensaje": "Datos de encuesta inválidos",
  "idTraza": "562f31da", "ruta": "POST /api/encuestas",
  "errores": ["El campo \"puntuacion\" es obligatorio y debe ser un número entero entre 1 y 5"] }
```

**POST con una orden que no existe → 404**

```json
{ "estado": 404, "tipo": "NO_ENCONTRADO",
  "mensaje": "No se puede registrar la encuesta: La orden de servicio #99 no existe",
  "idTraza": "6cd6e6e6", "ruta": "POST /api/encuestas" }
```

**POST con una orden que no está entregada → 400 `SOLICITUD_INVALIDA`**

```json
{ "estado": 400, "tipo": "SOLICITUD_INVALIDA",
  "mensaje": "No se puede encuestar la orden #12 porque su estado es \"en proceso\". Solo se admiten encuestas para órdenes con estado \"entregado\".",
  "idTraza": "4cc87ee0", "ruta": "POST /api/encuestas" }
```

**POST con una orden que ya tiene encuesta → 409**

```json
{ "estado": 409, "tipo": "CONFLICTO",
  "mensaje": "La orden de servicio #11 ya cuenta con una encuesta de satisfacción registrada (ID: 1)",
  "idTraza": "74a69c5a", "ruta": "POST /api/encuestas" }
```

**GET `/api/encuestas/999` → 404**

```json
{ "estado": 404, "tipo": "NO_ENCONTRADO", "mensaje": "Encuesta con ID 999 no encontrada",
  "idTraza": "da02e41d", "ruta": "GET /api/encuestas/999" }
```

**Ruta inexistente (`GET /api/no-existe`) → 404, en JSON y no en HTML**

```json
{ "estado": 404, "tipo": "NO_ENCONTRADO", "mensaje": "Ruta no encontrada: GET /api/no-existe",
  "idTraza": "eab5b445", "ruta": "GET /api/no-existe" }
```

## 9. Pruebas

| Tipo | Cómo se ejecuta | Estado |
|---|---|---|
| Automáticas (`test-suite.js`) | `npm test` | Disponible |
| Manuales con Postman | Importar `postman/kodo-motor-backend.postman_collection.json` y ejecutar *Run collection* | Disponible |
| Reporte de pruebas QAS de Repuestos y Encuestas | Documento del equipo con petición, resultado esperado, resultado obtenido y evidencia | En elaboración |

## 10. Incidencias detectadas

| Incidencia | Causa | Mejora aplicada o pendiente |
|---|---|---|
| Las respuestas devuelven `modeloCompatible`, `stockMinimo` y `ordenId` (camelCase), pero el cuerpo que se envía usa `modelo_compatible`, `stock_minimo` y `orden_id` (snake_case) | Los modelos exponen sus propiedades en camelCase al serializar | Documentado en la sección 8 para que el cliente no se confunda |
| La rama de trabajo partía de una versión anterior a la semana 10: sin `idTraza`, `AppError` ni `asyncHandler`, y con errores de la forma `{ "mensaje": ... }` | La rama se creó antes de integrar la capa de errores | Pendiente: integrar la capa de errores de la semana 10 y comprobar un `GET` real |
| No se podía dar de baja un repuesto con stock | Regla de negocio de almacén | Documentada: responde 400 mientras `stock` sea mayor a 0 |
