# Sebams

Una extensión de nueva pestaña para Chrome con tareas por materia, fechas, listas, fotos de referencia, reloj, fondos, accesos directos y recordatorios al entrar.

## Descargar

Abre **Releases** y descarga **Sebams.zip** y, si quieres usar las actualizaciones compartidas o la IA opcional, **Sebams-Bridge.zip**.

La versión actual es **1.8.0**. El código de la extensión está en [extension](extension) y el servicio local en [bridge](bridge).

## Instalar

1. Extrae Sebams.zip a una carpeta permanente.
2. Abre chrome://extensions, activa Developer mode y pulsa Load unpacked.
3. Selecciona la carpeta Sebams que contiene manifest.json.

## Actualizaciones en varias computadoras

En cada PC, extrae Sebams-Bridge.zip, abre SetupUpdates.cmd y selecciona la carpeta instalada de la extensión. Inicia Start.cmd y conecta su código propio en **Settings → AI**. Usa este repositorio público en **Settings → Updates → Release source**.

Activa **Check for updates automatically** para comprobar una vez al día, o pulsa **Check for updates**. **Install update** instala la versión encontrada y recarga Sebams. Cada computadora conserva sus propias tareas; los datos personales no se sincronizan.

No hace falta una clave de IA para las actualizaciones. Bridge requiere Node.js 22 o superior. El archivo **sebams-update.json** de cada Release es el paquete que utiliza el actualizador.

## Recordatorios

Configura **Settings → General → Task reminders**. Por defecto aparece una ventana al entrar desde un día antes a las 9 AM. Puedes cambiar la antelación y hora, abrir o completar la tarea y posponer los avisos una hora.

[Guía de la versión 1.8](extension/GUIA-1.8.md) · [Privacidad](extension/PRIVACY.md) · [Verificación](extension/VERIFY.md)

## Desarrollo

La extensión usa HTML, CSS y módulos JavaScript locales, sin compilación. Sus pruebas se ejecutan con Node.js 24 desde extension mediante npm test. Bridge incluye pruebas para tareas, MCP y actualizaciones; sus dependencias se instalan con Start.cmd o pnpm install dentro de bridge.

Las Releases contienen el código distribuible. Claves de API, códigos de conexión, perfiles de Chrome y datos personales quedan fuera del repositorio.
