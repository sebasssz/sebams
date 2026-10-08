# Sebams 1.7

- **Links:** la cruz al lado de cada acceso lo elimina. **Undo** lo recupera, incluido su pin si lo tenía.
- **Orden:** arrastra los accesos de Links o los del dashboard. En Links, el orden se cambia dentro de cada carpeta. También puedes enfocar un acceso y usar **Alt + ↑ / ↓**. Para cambiar de carpeta, usa **Manage links**.
- **Tasks:** se quitó el pie de la barra lateral con “PERSONAL / Counts show unfinished tasks”.
- **Paneles:** el fondo se oscurece sin desenfoque. **Settings → Appearance → Panel opacity** ajusta la transparencia. El ajuste **Background blur** sigue disponible para la fotografía completa si lo quieres activar.
- **Actualizaciones:** abre **Settings → Updates → Check for updates**. Si hay una versión nueva preparada en el servicio local, aparece **Install update**. Al instalar, Sebams guarda los borradores de detalles pendientes y se recarga. Si otra pestaña cambió un borrador o una petición de IA sigue activa, hay que resolverlo antes.
- **Comprobación automática:** activa **Check for updates automatically** para comprobar una vez al día mientras Chrome y Sebams Bridge están abiertos. La instalación la eliges tú.

## Activar esta versión por primera vez

Los archivos de la instalación existente se actualizan en la misma carpeta. Pulsa **Recargar** en la tarjeta de Sebams en `chrome://extensions` y abre una pestaña nueva. Ese paso inicial permite que aparezca Updates. Las siguientes versiones preparadas podrán instalarse desde Sebams.

## De dónde salen las actualizaciones

Para esta extensión personal, el servicio local lee versiones preparadas en `Sebams-Bridge/releases/stable`. No hay un servidor público de versiones ni una publicación en Chrome Web Store. El botón no busca código por Internet y no prepara una nueva versión por sí solo. Una versión futura debe publicarse en esa carpeta después de comprobar sus cambios.

El servicio verifica el tamaño y SHA-256 de todos los archivos antes de instalar. Solo sustituye la carpeta de la extensión configurada en su archivo privado `data/updates.json`. Deja la versión anterior en `Sebams-version-backups`, junto a la carpeta instalada. Los datos de tareas, fotos y ajustes permanecen en el almacenamiento de Chrome, con la misma identidad de extensión.
