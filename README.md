# Sebams 2.1

Una nueva pestaña para organizar tu día: tareas, perfiles, notas, enlaces, fondos y herramientas de enfoque.

## Cuenta y sincronización entre dispositivos

**Settings → Account** prepara el inicio de sesión con correo y código de seis números. La cuenta sincroniza perfiles, tareas, detalles, notas, enlaces, hábitos, preferencias, fondos subidos y fotos de referencia. Los cambios independientes se combinan y los conflictos requieren una elección. Una copia local anterior permite recuperar datos. Los temporizadores en ejecución y los códigos de conexión siguen en su dispositivo.

**Activación del correo pendiente:** el propietario debe configurar un remitente verificado de Brevo y los secretos del servidor. La extensión muestra un error claro mientras falta esta configuración; no simula el envío. Tus amigos solo necesitan iniciar sesión cuando el servicio esté activado. [Configuración del servidor](sites/sebams-connect/EMAIL-SETUP.md).

## Sebams Groups

En Tasks abre la flecha junto al nombre de la vista (por ejemplo Inbox) y elige **Groups**, o usa Groups en la barra lateral. **Create group** genera una invitación de seis letras; tus compañeros eligen **Join group** e introducen el código. La membresía se conserva al cerrar o cambiar de dispositivo.

Todos pueden crear y asignar tareas con fecha y prioridad. Solo el responsable puede completarlas o reabrirlas. Solo el líder cambia el nombre, gestiona miembros y elimina el grupo. La eliminación pide confirmación y permite restaurar el grupo con sus miembros y tareas desde Deleted groups. Las tareas personales y fotos no se comparten con los miembros.

## Instalar o actualizar

Descarga **Sebams.zip** en [Releases](https://github.com/sebasssz/sebams/releases/latest). Conserva la carpeta y la instalación de la extensión para mantener tus datos, actualiza sus archivos y pulsa **Reload** en la página de extensiones. Actualiza todos tus dispositivos a 2.1.

**Sebams-Bridge.zip** es el instalador opcional para la extensión desempaquetada. Cada PC elige su carpeta con SetupUpdates.cmd, inicia Bridge y conecta su código en Settings → Updates. El actualizador usa este repositorio, verifica **sebams-update.json** y conserva la versión anterior. Las cuentas y Groups funcionan en el servidor, sin Bridge.

## Perfiles y ChatGPT

Settings → Profiles crea, renombra, colorea, elimina y restaura hasta 12 perfiles. La conexión opcional de ChatGPT sigue en Settings → ChatGPT. Su URL MCP es **https://sebams-connect.poeticbadge1.chatgpt.site/mcp**, con autenticación OAuth. La cuenta de Sebams y la conexión de ChatGPT son independientes; las fotos no se envían automáticamente a ChatGPT. Cambiar de cuenta de Sebams pausa la conexión anterior para evitar mezclar cuentas.

[Guía 2.1](extension/GUIA-2.1.md) · [Privacidad y límites](extension/PRIVACY.md) · [Verificación](extension/VERIFY.md) · [Sugerencias](https://github.com/sebasssz/sebams/issues)

El repositorio y los paquetes contienen código, recursos y pruebas. No incluyen credenciales, códigos de conexión, perfiles de navegador ni datos personales. La configuración privada del correo se mantiene fuera del repositorio y de las descargas.
