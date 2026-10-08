# Sebams 1.8

## Recordatorios al entrar

En **Settings → General → Task reminders**, activa **Reminders when opening Sebams**. El valor inicial es **1 day before** y **09:00**: una tarea con fecha del viernes aparece desde las 9 AM del jueves cuando abres o vuelves a Sebams.

Puedes cambiar la antelación, elegir **Custom** para escribir minutos y cambiar la hora de referencia del día de entrega. Si Sebams estaba cerrado, muestra el recordatorio en tu siguiente visita. **Preview reminder** enseña una ventana de ejemplo.

La ventana permite abrir la tarea, completarla, posponer todos los avisos mostrados una hora o descartarlos con **Got it**. Descartar no completa la tarea y oculta ese aviso para su fecha y horario actuales. Cambiar la fecha o el horario crea un aviso nuevo. Las tareas completadas no aparecen. Se muestran hasta ocho avisos por vez, de todos tus espacios.

Una hora específica elegida dentro de la tarea tiene prioridad sobre el horario general. Al completar una tarea repetitiva se crea su siguiente repetición. Las notificaciones de Windows siguen disponibles como opción aparte en **Optional desktop notifications**.

Los avisos no interrumpen una tarea abierta mediante un enlace directo, otra ventana, un borrador ni una sesión de concentración. Los avisos no se ejecutan mientras Sebams está cerrado; las notificaciones de escritorio opcionales son independientes.

## Actualizaciones en tu PC y la de un amigo

La versión local que hay en tu PC no llega por sí sola a la de tu amigo. Para compartir versiones, esta entrega admite un **repositorio público de GitHub Releases**. El repositorio público es [https://github.com/sebasssz/sebams](https://github.com/sebasssz/sebams). Usa ese enlace como fuente compartida en todas tus computadoras.

En cada PC:

1. Extrae el ZIP completo de **Sebams Bridge**, conservando la carpeta `releases`.
2. Abre **SetupUpdates.cmd** y selecciona la carpeta de la extensión que contiene `manifest.json`, la misma que cargaste en Chrome.
3. Abre **Start.cmd** y conecta su código local en **Settings → AI**. Cada PC usa su propio código. No necesitas una clave de Gemini para actualizar.
4. En **Settings → Updates → Release source**, guarda el mismo enlace del repositorio público en todas las PCs. También puedes introducirlo durante SetupUpdates.
5. Activa **Check for updates automatically** para comprobar una vez al día. **Check for updates** comprueba en ese momento. **Install update** instala la versión encontrada y recarga Sebams.

Los datos personales siguen en el perfil de Chrome de cada PC. Las tareas no se sincronizan entre computadoras. Se conserva la versión anterior en `Sebams-version-backups`. Para volver a archivos locales, deja vacío el repositorio y guarda la fuente.

## Publicar la próxima versión

Para publicar una nueva versión en el repositorio:

1. Prepara la versión de Sebams con su número actualizado y verifica sus cambios.
2. Genera el archivo **sebams-update.json**; esta entrega incluye uno para **1.8.0**.
3. Crea una GitHub Release estable con etiqueta **v1.8.0** para esta entrega y adjunta **sebams-update.json** con ese nombre exacto. Una futura versión usará su propio número y archivo generado.
4. Publica también **Sebams.zip** y **Sebams-Bridge.zip** si quieres facilitar la instalación inicial. No publiques la carpeta `data`, `.env`, claves de API, códigos de conexión ni perfiles de Chrome.

Bridge consulta la última publicación estable, descarga el archivo de actualización, comprueba su versión y los hashes de todos los archivos antes de instalar. Una versión modificada después de comprobarla requiere una nueva comprobación. Una descarga fallida deja intacta la extensión instalada.

GitHub distribuye los archivos; Bridge instala la extensión cargada manualmente en cada PC. Para distribuirla con las actualizaciones administradas directamente por Chrome habría que publicarla en Chrome Web Store. El propio Bridge se actualiza reemplazando sus archivos con el ZIP nuevo y conservando `.env` y `data`.

Referencias: [GitHub Releases](https://docs.github.com/en/rest/releases/releases?apiVersion=latest), [distribución de extensiones de Chrome](https://developer.chrome.com/docs/extensions/how-to/distribute).
