# Sebams 1.9 — Plugin de ChatGPT

Esta versión retira el asistente Gemini de Tasks y lo sustituye por un plugin privado de Sebams para ChatGPT. No necesitas una clave de API de IA ni ejecutar Sebams Bridge para esta conexión.

## Conectar

1. Conserva la carpeta instalada de Sebams, actualiza sus archivos y pulsa Reload en su tarjeta de chrome://extensions (o brave://extensions). Abre una nueva pestaña.
2. Instala el plugin **Sebams** desde ChatGPT → Plugins → Personal → Created by you.
3. En Sebams, abre **Settings → ChatGPT → Connect ChatGPT**. Acepta acceso únicamente al sitio de conexión de Sebams.
4. Se abrirá https://sebams-connect.poeticbadge1.chatgpt.site/connect. Inicia sesión con la misma cuenta de ChatGPT del plugin. La página vincula tu extensión y sincroniza las tareas. Puedes cerrarla cuando indique que está conectado.
5. En un chat, selecciona **@Sebams**.

Puedes decir «¿Qué tareas tengo para mañana?», «Añade repasar matemáticas para mañana con prioridad alta», o «Cambia la fecha de mi tarea de historia al viernes». ChatGPT puede consultar las materias/listas, resolver fechas usando tu zona horaria y crear o editar la tarea. Si falta una fecha clara, puede preguntártela. La confirmación de acciones del propio ChatGPT sigue aplicándose.

## Sincronización

- Funciona mientras Chrome o Brave están abiertos, al entrar en Sebams, después de guardar cambios y aproximadamente cada minuto. No necesitas mantener un programa local ni una terminal abiertos.
- ChatGPT puede consultar la última copia sincronizada y crear tareas aunque el navegador esté cerrado. Sus cambios aparecen al volver a sincronizar Sebams. Los resultados incluyen la fecha de la última sincronización.
- Se sincronizan títulos, detalles, materias/listas, fechas, prioridades y estado de finalización de los tres espacios. Las fotos, respuestas antiguas, subtareas, planes de examen, notas generales, fondos y preferencias permanecen en este dispositivo.
- Un cambio de prioridad o fecha conserva las fotos y extras locales de esa tarea. Los cambios simultáneos a distintos campos se combinan. Si ambos editan el mismo campo, **Settings → ChatGPT** permite elegir **Keep Sebams** o **Keep ChatGPT**.
- **Sync now** fuerza una comprobación. **Disconnect ChatGPT** detiene la sincronización y conserva las tareas locales. Las tareas ya sincronizadas siguen en tu espacio privado; desconectar no las borra de la nube.
- La conexión usa el inicio de sesión de tu cuenta. Si las cookies impiden la petición desde la extensión, se utiliza brevemente la página de conexión autenticada. Si la sesión caduca, abre **Open connection page**, inicia sesión y vuelve a sincronizar.

## Fotos y ayuda con una tarea

Tasks mantiene los detalles y hasta cuatro fotos de referencia por tarea. **View**, **Download** y **Copy for ChatGPT** siguen disponibles. El plugin no recibe las fotos automáticamente: adjúntalas en el chat cuando quieras que ChatGPT las lea. Las respuestas del asistente anterior quedan como una nota de estudio guardada.

## Actualizaciones

La conexión local de **Sebams Bridge** ahora está en **Settings → Updates → Local update installer**. Se conserva para reemplazar los archivos de la extensión desempaquetada y guardar una copia de la versión anterior. Es independiente del plugin de tareas y no requiere una clave de IA.

Repositorio de versiones: https://github.com/sebasssz/sebams.
