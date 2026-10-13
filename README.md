# Sebams

Extensión de nueva pestaña con tareas por materia, fechas, prioridades, fotos de referencia, recordatorios, notas, fondos y accesos directos.

El código actual en main es **1.9.0**. Esta versión retira el asistente integrado y añade un plugin privado de Sebams para ChatGPT. La conexión de tareas funciona sin Sebams Bridge ni clave de API de IA.

## Conectar ChatGPT

Instala el plugin Sebams desde Plugins → Personal → Created by you. En la extensión abre **Settings → ChatGPT → Connect ChatGPT**, permite acceso al sitio privado de conexión e inicia sesión con la misma cuenta. Selecciona **@Sebams** en el chat y pregunta «¿Qué tengo para mañana?» o pide añadir una tarea con fecha y prioridad.

El plugin es personal de la cuenta que creó el conector; no es una app pública de la tienda. Se sincronizan tareas, detalles, listas, fechas, prioridades y finalización. Las fotos y otros datos del dashboard permanecen locales. Los cambios simultáneos se conservan para revisión.

[Guía 1.9](extension/GUIA-1.9.md) · [Privacidad](extension/PRIVACY.md) · [Verificación](extension/VERIFY.md)

## Instalar o actualizar

Las descargas de Releases contienen la última versión publicada como Release. Para usar el código actual, descarga el ZIP de main, conserva tu carpeta instalada y copia allí el contenido de **extension/**. Pulsa Reload en la tarjeta de Sebams de chrome://extensions o brave://extensions. Mantener la carpeta y la instalación conserva sus datos.

## Actualizaciones

Bridge sigue siendo el instalador opcional de la extensión desempaquetada. Su conexión está ahora en **Settings → Updates → Local update installer**. Cada PC configura su carpeta con SetupUpdates.cmd y usa este mismo repositorio como fuente de Releases. Las tareas de cada navegador permanecen independientes hasta conectar explícitamente el plugin privado de ChatGPT.

No se publican claves, códigos de conexión, perfiles de navegador ni tareas personales. La extensión usa HTML, CSS y JavaScript sin compilación. El backend privado usa MCP, autenticación de Sites y D1. Las pruebas de Chrome requieren el checkout completo; las pruebas unitarias de la extensión se ejecutan con Node.js 24.
