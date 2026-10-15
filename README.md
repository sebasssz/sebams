# Sebams 2.0

Una nueva pestaña para organizar tu día: tareas, perfiles, notas, enlaces, fondos, recordatorios y temporizador.

## Nuevo diseño y perfiles

El dashboard y los paneles comparten un diseño oscuro y neutro. Settings usa navegación lateral en escritorio y categorías deslizables en pantallas pequeñas. Tasks, Links, notas, fondos y las demás herramientas conservan sus funciones con controles más claros.

Usa el botón de perfil de la esquina superior izquierda para cambiar de espacio. **Settings → Profiles** permite crear hasta 12 perfiles activos, cambiar su nombre/color y eliminarlos con confirmación. **Recently deleted** conserva el contenido local y sus fotos hasta restaurarlo o confirmar su eliminación permanente. Los backups incluyen los perfiles eliminados.

## Instalar o actualizar

Descarga **Sebams.zip** en [Releases](https://github.com/sebasssz/sebams/releases/latest). Conserva la misma carpeta y la instalación de la extensión para mantener tus datos; actualiza los archivos y pulsa Reload en chrome://extensions o brave://extensions.

La versión 2.0 migra los datos existentes y convierte Personal, Work y Study en perfiles editables. **Actualiza todos los equipos conectados a la misma cuenta a 2.0.** Los clientes antiguos conservan los datos locales y piden actualizar antes de sincronizar una cuenta que ya usa perfiles.

**Sebams-Bridge.zip** es el instalador opcional para la extensión desempaquetada. Cada PC elige su carpeta con SetupUpdates.cmd, inicia Bridge y conecta su código en Settings → Updates → Local update installer. Usa este repositorio como fuente de Releases. El actualizador verifica **sebams-update.json** y guarda la versión anterior.

## ChatGPT

Conecta tu propia cuenta desde **Settings → ChatGPT → Connect ChatGPT**. En ChatGPT abre **Plugins → + → Add custom MCP server**, usa el nombre Sebams y la URL **https://sebams-connect.poeticbadge1.chatgpt.site/mcp**, con autenticación OAuth. Instala la conexión y selecciona **@Sebams**. Si ya tienes la conexión instalada, puedes seguir usándola.

El conector admite otras cuentas sin aprobación individual del creador y mantiene los datos separados por usuario. Reconoce los perfiles personalizados y sincroniza metadatos de perfiles/listas y tareas. Las fotos, notas, enlaces, hábitos y Recently deleted permanecen locales. La eliminación de un perfil conectado se sincroniza para su copia activa de tareas; si entra en conflicto con otra edición, conserva el perfil hasta que elijas qué versión mantener.

No hace falta una clave de API de IA ni un servicio local para las tareas de ChatGPT. La instalación, los avisos de autorización y las políticas de cuenta dependen de ChatGPT. Publicar el servicio no equivale a una aprobación en el directorio público de plugins.

## Sugerencias

**Settings → Suggestions** prepara una idea o un reporte como borrador de GitHub. El usuario inicia sesión, revisa el texto y pulsa Create para enviarlo. Las sugerencias son públicas y podemos leer y responder en [Issues](https://github.com/sebasssz/sebams/issues).

[Guía 2.0](extension/GUIA-2.0.md) · [Privacidad](extension/PRIVACY.md) · [Verificación](extension/VERIFY.md)

El repositorio y los paquetes incluyen solo código, recursos y pruebas. No se publican credenciales, códigos de conexión, perfiles de navegador ni tareas personales.
