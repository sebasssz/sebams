# Sebams 2.1 — cuenta y grupos

## Cuenta con correo y código

Abre **Settings → Account**, escribe tu correo y el nombre que verán tus compañeros y pulsa **Send verification code**. Introduce el código de seis números y pulsa **Verify and sync**. No necesitas Google ni una clave de IA.

El código caduca en diez minutos, funciona una sola vez y tiene cinco intentos. Puedes pedir otro después de un minuto. Recordar el dispositivo mantiene su sesión durante treinta días; sin esa opción dura un día. Cerrar sesión en un dispositivo conserva sus datos locales y no cierra los demás.

La primera activación del correo requiere que el propietario configure Brevo en el servidor. Sin esa configuración, Sebams muestra un error claro y no simula que envió el código. Es una configuración del proyecto, no algo que deban hacer tus amigos.

## Tu información en otro dispositivo

Instala la misma versión de Sebams e inicia sesión con el mismo correo. Se sincronizan perfiles, tareas y sus detalles, notas, enlaces, hábitos, planes, preferencias, fondos subidos y fotos de referencia, incluida la colección de perfiles eliminados. Los fondos de la API conservan sus selecciones y metadatos; su caché y los permisos para descargarlos siguen siendo locales.

Los temporizadores en ejecución, códigos de conexión y sesiones se quedan en cada dispositivo. La cuenta de Sebams y el plugin de ChatGPT son conexiones separadas. Las fotos de la cuenta no se mandan automáticamente a ChatGPT. Al cambiar a otra cuenta de Sebams, se pausa la conexión anterior de ChatGPT y se pide confirmar antes de combinar los datos del dispositivo con otra cuenta.

La sincronización se ejecuta mientras el navegador está abierto, al guardar y aproximadamente cada minuto. **Sync all devices** permite solicitarla. Los cambios sin conexión se guardan localmente. Los cambios independientes se combinan. Si dos dispositivos cambian lo mismo, Account pide elegir la copia completa que conservar. **Previous local copy** permite descargar la copia local anterior con sus fotos antes de aplicar cambios de la nube.

La cuenta admite hasta 64 MB de archivos subidos en el servidor. Los límites locales anteriores se mantienen. Los archivos ya subidos cuentan para esta cuota aunque dejen de estar referenciados por la copia actual; esta versión no incluye una herramienta para purgar la cuenta del servidor. Los backups descargados son independientes y siguen siendo recomendables.

## Sebams Groups

En **Tasks**, abre la flecha junto al nombre de la vista, por ejemplo **Inbox**, y elige **Groups**. También tienes **Groups** en la barra lateral.

1. **Create group**: escribe el nombre. Quien crea el grupo es su líder.
2. Comparte el código de seis letras que aparece. El código es una invitación: compártelo solo con las personas que quieras dentro.
3. Tus compañeros inician sesión en su propia cuenta y eligen **Join group**. Introducen el código y aparecen en la lista de miembros.
4. Al crear una tarea, elige responsable, fecha y prioridad. Todos pueden crear y asignar tareas. Solo su responsable puede completarla o reabrirla.

La vinculación se guarda en el servidor y se conserva al recargar, cerrar el navegador o cambiar de dispositivo. Todos ven las tareas y nombres de su grupo; sus perfiles, notas, enlaces, fotos y tareas personales no se comparten con el grupo.

Solo el líder puede cambiar el nombre, quitar miembros o eliminar el grupo desde **Group settings**. Las tareas de un miembro que sale o es retirado pasan al líder. Eliminar el grupo pide confirmación y lo mueve a **Deleted groups**, donde el líder puede restaurarlo con sus miembros y tareas. Los miembros pueden salir por su cuenta; el líder debe eliminar el grupo para salir.

Límites de esta versión: hasta 20 grupos activos creados por cuenta, 50 miembros y 300 tareas activas por grupo. Para escribir o actualizar tareas del grupo necesitas conexión; el borrador permanece en la pantalla si falla el envío. Los datos de los grupos se guardan en el servidor y no forman parte del backup personal.

## Instalar la actualización

Conserva tu carpeta instalada y actualiza sus archivos, o usa **Check for updates** con el instalador opcional de Bridge. Pulsa **Reload** en la página de extensiones. **Finish update and reload** también permite terminar una actualización pendiente. Actualiza todos tus dispositivos a 2.1.
