# Sebams Bridge: IA gratuita con Gemini

Sebams 1.6.0 usa Gemini 3.8 Flash para ofrecer pistas, explicar conceptos y planificar el estudio. Las fotos se envían solo si activas Include reference photos in this AI request; también puedes consultarlas localmente como referencias. La clave se guarda en este servicio local, fuera de Chrome y de los backups. No usa la API de OpenAI ni cambia a otro proveedor al agotar una cuota.

## Activación gratis

1. Entra en [Google AI Studio](https://aistudio.google.com/apikey), crea una clave y comprueba que el proyecto indique **Free Tier**. No actives facturación ni vincules una cuenta de cobro. No pegues la clave en este chat ni en Sebams.
2. Extrae Sebams-Bridge a una carpeta estable. Copia `.env.example` a un archivo llamado `.env`. Pon la clave después de `GEMINI_API_KEY=` y conserva `GEMINI_MODEL=gemini-3.8-flash`. Si ya usabas el puente anterior, reemplaza sus archivos conservando tu carpeta `data`; cambia las antiguas variables OPENAI por estas variables GEMINI.
3. Abre `Start.cmd`. Usa Node.js 22 o superior o el Node incluido en Codex. La primera vez instala el SDK de MCP y necesita Internet. Si ya estaba ejecutándose, abre primero `Stop.cmd` y vuelve a iniciarlo.
4. Copia el código de conexión que muestra la ventana en **Sebams → Settings → AI**. Este código es distinto de la clave de Gemini.
5. Abre una tarea, escribe el enunciado o adjunta sus fotos y pulsa **Ask AI**.

El proveedor ofrece una modalidad gratuita con límites que dependen del proyecto y el modelo. Si recibes un error de cuota, espera a que se restablezca; Sebams no compra créditos ni activa facturación. Una clave de un proyecto que ya tenga facturación sí puede generar cargos: usa un proyecto Free Tier sin facturación. [Precios](https://ai.google.dev/gemini-api/docs/pricing), [límites](https://ai.google.dev/gemini-api/docs/rate-limits), [claves](https://ai.google.dev/gemini-api/docs/api-key).

Google puede usar el contenido de la modalidad gratuita para mejorar sus productos. El envío incluye solo el título, detalles, prioridad, fecha, lista e imágenes de la tarea elegida. Usa Interactions API con `store:false`, que no elimina las condiciones de uso del proveedor. El servicio no conserva fotos ni respuestas. Se guardan en la tarea dentro de Sebams. Las peticiones completas con imágenes inline deben medir menos de 19 MB; si tus fotos son muy grandes, reduce su tamaño antes de enviarlas. Los adjuntos locales mantienen el límite de cuatro fotos y 8 MB por foto. [Imágenes](https://ai.google.dev/gemini-api/docs/image-understanding), [datos](https://ai.google.dev/gemini-api/docs/interactions-overview).

La integración se probó con respuestas simuladas. Todavía debes configurar tu propia clave gratuita para una respuesta real.

## MCP en un asistente local

El archivo `mcp-stdio.mjs` usa el SDK oficial. Configura tu cliente MCP para ejecutar `node` con la ruta absoluta del archivo. Primero inicia el puente con `Start.cmd`. El adaptador lee el codigo local y habla con el puente; no lo incluyas en la configuracion del cliente.

```json
{
  "mcpServers": {
    "sebams": {
      "command": "node",
      "args": ["C:\\ruta\\Sebams-Bridge\\mcp-stdio.mjs"]
    }
  }
}
```

Si `node` no esta en PATH, usa la ruta absoluta a `node.exe` como `command`. Este formato es un ejemplo para clientes que admiten `mcpServers`; sigue la configuracion propia de tu cliente.

`prepare_task` pide cada dato que falte: titulo, prioridad baja/normal/alta, fecha o «sin fecha», materia/lista y espacio. Usa un formulario si el cliente admite elicitation; si no, devuelve preguntas que el asistente debe hacerte. `create_task` exige todos los datos y un `operationId` unico. Reintentar la misma operacion no duplica la tarea. [SDK y servidor MCP oficial](https://developers.openai.com/plugins/build/mcp-server)

## Conectar con ChatGPT mediante Secure MCP Tunnel

ChatGPT en la nube no puede acceder directamente a `127.0.0.1`. Esta entrega incluye el adaptador local, pero no crea un tunel ni conecta tu cuenta automaticamente. La opcion documentada para un servidor privado es Secure MCP Tunnel, si tu cuenta y espacio de ChatGPT tienen acceso al modo desarrollador.

Necesitas crear un tunel en tu organizacion de OpenAI Platform, asociarlo a tu espacio de ChatGPT e instalar el `tunnel-client` oficial siguiendo la guia. Crear el tunel requiere permisos **Tunnels Read + Manage**; ejecutarlo requiere una clave con **Tunnels Read + Use**. Esa clave de tunel es independiente del codigo local de Sebams. No publiques el puerto 8787 ni lo expongas con un tunel publico sin autenticacion.

La guia oficial muestra estos comandos. Sustituye el ID y las rutas por los tuyos; usa rutas sin espacios o consulta el cliente para citar correctamente una ruta de Windows. `CONTROL_PLANE_API_KEY` se configura en el entorno del cliente y no en Chrome:

```powershell
$env:CONTROL_PLANE_API_KEY = 'TU_CLAVE_DE_TUNEL'
tunnel-client init --sample sample_mcp_stdio_local --profile sebams --tunnel-id tunnel_TU_ID --mcp-command "node C:/ruta/Sebams-Bridge/mcp-stdio.mjs"
tunnel-client doctor --profile sebams --explain
tunnel-client run --profile sebams
```

Con el puente y el cliente de tunel activos, agrega la app en el modo desarrollador de ChatGPT y selecciona **Tunnel**. La disponibilidad y las opciones dependen de tu cuenta. No se ha verificado una conexion a tu cuenta; las pruebas entregadas usan MCP local. [Guia oficial de Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## Actualizaciones locales de Sebams

La extension 1.8 incluye **Settings → Updates → Check for updates**, comprobaciones diarias opcionales y una fuente compartida de **GitHub Releases**. Una publicacion estable del repositorio publico elegido debe incluir el archivo **sebams-update.json**. Cada PC descarga la misma version y Bridge la instala en su propia carpeta, con verificacion de todos los archivos y copia de la version anterior. No hace falta una clave de Gemini para actualizar.

En cada PC abre **SetupUpdates.cmd**, selecciona la carpeta instalada de Sebams que contiene manifest.json y, opcionalmente, indica el repositorio publico. Inicia Start.cmd y conecta el codigo propio de esa PC en Settings → AI. Puedes guardar o cambiar el repositorio en **Settings → Updates → Release source**. El repositorio de Sebams es [https://github.com/sebasssz/sebams](https://github.com/sebasssz/sebams); configuralo como fuente compartida en cada PC. Consulta la guia GUIA-1.8.md de la extension para publicar la primera Release.

Las rutas absolutas se guardan en el archivo privado data/updates.json. No se distribuyen en el ZIP y no se cambian desde HTTP. GET /updates/source y POST /updates/source permiten consultar y cambiar solo el repositorio, con el codigo privado de conexion. Dejarlo vacio utiliza releases/stable local. GET /updates?current=1.8.0 comprueba la version y su huella; POST /updates/install vuelve a comprobar el paquete antes de instalar. No se aceptan versiones anteriores ni archivos modificados desde la comprobacion. Si falla el cambio final de carpetas, se restaura la version anterior.

GitHub recibe solicitudes de version y descarga desde Bridge; no recibe tareas, fotos personales, la clave de Gemini ni el codigo de conexion. Solo se admiten repositorios publicos y descargas HTTPS de GitHub y sus servidores de assets. La conexion de Chrome sigue siendo local. Cada PC conserva sus propios datos; no hay sincronizacion personal entre computadoras. Las actualizaciones se comprueban automaticamente si lo activas, y **Install update** requiere tu accion. Bridge debe seguir ejecutandose.

La publicacion administra la extension. Para actualizar el propio Bridge, reemplaza sus archivos con el ZIP nuevo, conserva .env y data y reinicialo. Las instalaciones cargadas manualmente deben conservar Developer mode en Chrome para poder recargarse. Chrome Web Store es la alternativa para distribucion y actualizaciones administradas por Chrome sin este instalador local.
