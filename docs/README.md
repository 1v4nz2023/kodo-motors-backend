# Documentación técnica de QA

Esta carpeta guarda la documentación de pruebas del equipo E2 (servicios **Encuestas** y **Repuestos**).

| Contenido | Qué es |
|---|---|
| `QAS-Pruebas-G2-EE3.docx` | Reporte de pruebas técnicas en QAS: petición, resultado esperado, resultado obtenido, estado y evidencia de cada caso |
| `evidencias/` | Capturas tipo `curl` de cada caso: R-01 a R-22 (Repuestos), E-01 a E-15 (Encuestas) y las evidencias «antes» de los defectos que se corrigieron |

Los casos se ejecutaron contra la API real (Node.js, Express y MySQL 8.0) con los datos de `database/02_seed.sql`.
