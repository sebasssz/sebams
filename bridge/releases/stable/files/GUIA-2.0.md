# Sebams 2.0 — Una página más organizada

## Nuevo diseño

El dashboard, Tasks, Links, Settings, notas, temporizador, fondos y recordatorios comparten un diseño oscuro y neutro, con controles más claros y paneles legibles. Settings tiene navegación lateral en escritorio y categorías deslizables en pantallas pequeñas. La opacidad sigue siendo ajustable en Appearance.

## Perfiles

El botón de la esquina superior izquierda cambia rápidamente de perfil. **Manage profiles** o **Settings → Profiles** abre la gestión completa.

- **New profile** crea un espacio vacío con nombre y color. Puedes tener hasta 12 perfiles activos.
- **Rename** cambia el nombre y el color sin cambiar la identidad ni perder su contenido.
- **Delete** muestra una confirmación y mueve el perfil, con sus tareas, notas, fotos, enlaces y hábitos, a **Recently deleted** en este dispositivo. Se conserva al menos un perfil activo. Los temporizadores de tareas de ese perfil se pausan y sus recordatorios dejan de aparecer.
- **Restore** recupera el contenido y sus fotos. Si el nombre ya está ocupado, se añade un sufijo al nombre restaurado.
- **Delete forever** requiere una confirmación explícita. Solo borra la copia de Recently deleted de este dispositivo; no borra los backups que hayas descargado ni las copias guardadas en otros equipos.

Recently deleted admite hasta 12 perfiles. No se vacía automáticamente y se incluye en los backups. Cuando se llena, restaura un perfil o elimina permanentemente una copia que ya no necesites.

## ChatGPT y otros equipos

La conexión opcional reconoce los nombres, colores, listas y tareas de los perfiles personalizados. Las fotos, enlaces, notas, hábitos y la papelera permanecen locales. Al eliminar un perfil conectado se elimina su copia activa de tareas en la siguiente sincronización. Otros equipos con Sebams 2.0 conservan su contenido local en Recently deleted al recibir esa eliminación.

Si se elimina un perfil mientras otra copia modifica una de sus tareas, Settings → ChatGPT conserva el perfil completo hasta que elijas qué versión mantener. No se descartan las referencias locales de forma silenciosa.

**Actualiza a 2.0 todos los equipos conectados a la misma cuenta.** Los clientes anteriores dejan de sincronizar cuando la cuenta usa perfiles nuevos y muestran un mensaje para actualizar; sus datos locales se conservan. Los backups de 2.0 necesitan una versión compatible con el nuevo formato de perfiles.

## Actualizar

Conserva la misma carpeta instalada y actualiza con Check for updates, o copia los archivos de Sebams.zip en esa carpeta. Pulsa Reload en la tarjeta de Sebams de chrome://extensions o brave://extensions y abre una nueva pestaña. La migración conserva tareas, fotos, notas y preferencias existentes; Personal, Work y Study pasan a ser perfiles editables. No hace falta reinstalar la extensión.

Sugerencias sigue en Settings → Suggestions y prepara un borrador público en GitHub que el usuario revisa y envía con su cuenta. La conexión de ChatGPT sigue sin requerir una clave de API de IA ni un servicio local. La instalación y los avisos de autorización de ChatGPT dependen de ChatGPT.
