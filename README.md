# Sebams

Extensión de nueva pestaña con tareas por materia, fechas, prioridades, fotos de referencia, recordatorios, notas, fondos y accesos directos.

## Versión 1.10.0

**Settings → Suggestions** permite preparar una idea o un reporte y enviarlo como issue en GitHub. Requiere una cuenta de GitHub: el usuario revisa el borrador y pulsa Create para enviarlo. Las sugerencias son públicas y el equipo puede leer y responder en [Issues](https://github.com/sebasssz/sebams/issues). Solo se incluye el texto escrito, el tipo y la versión.

El conector de ChatGPT admite otras cuentas sin que el creador tenga que aprobar a cada persona. Las tareas se mantienen separadas por cuenta; publicar el servicio no publica las tareas.

## Instalar o actualizar

Descarga **Sebams.zip** en [Releases](https://github.com/sebasssz/sebams/releases/latest). Copia el contenido en la misma carpeta donde ya tienes instalada la extensión y pulsa Reload en chrome://extensions o brave://extensions. Mantener la carpeta y la instalación conserva los datos del navegador.

**Sebams-Bridge.zip** es el instalador opcional para la extensión desempaquetada. Cada PC elige su carpeta con SetupUpdates.cmd y conecta Bridge en Settings → Updates → Local update installer. Usa este repositorio como fuente. sebams-update.json es el paquete que consulta el actualizador.

## Conectar ChatGPT

En Sebams abre **Settings → ChatGPT → Connect ChatGPT** e inicia sesión con tu cuenta. En ChatGPT abre **Plugins → + → Add custom MCP server**, usa el nombre Sebams y la URL **https://sebams-connect.poeticbadge1.chatgpt.site/mcp**, con autenticación OAuth. Instala tu conexión y selecciona **@Sebams**. Si ya tienes Sebams instalado, puedes seguir usando esa conexión.

No hace falta una clave de API de IA ni Bridge para conectar tareas. Se sincronizan tareas, detalles, listas, fechas, prioridades y finalización. Las fotos y los demás datos del dashboard permanecen locales.

La instalación, los avisos de consentimiento y las políticas de cada cuenta siguen dependiendo de ChatGPT. La publicación del servicio no equivale a una aprobación en el directorio público de plugins; esa publicación requiere revisión de OpenAI.

[Guía 1.10](extension/GUIA-1.10.md) · [Privacidad](extension/PRIVACY.md) · [Verificación](extension/VERIFY.md)

No se publican claves, códigos de conexión, perfiles de navegador ni tareas personales. La extensión usa HTML, CSS y JavaScript sin compilación; el backend usa Sites, MCP y D1.
