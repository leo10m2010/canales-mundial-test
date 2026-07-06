# Player Embed

Abre la pagina con servidor local para evitar bloqueos de seguridad de `file://`.

## Windows

Ejecuta `start-server.bat` y abre:

```text
http://localhost:8080
```

Si un embed sigue sin cargar, normalmente es porque el sitio bloquea iframes o porque una extension del navegador bloquea scripts del propio embed.

La agenda usa Netlify Functions para evitar CORS. Con `start-server.bat` la biblioteca manual funciona, pero marcador y agenda automatica pueden no cargar hasta usar Netlify o Netlify CLI.

## Estructura

- `index.html`: estructura de la pagina.
- `styles.css`: interfaz, player y responsive.
- `channels.js`: lista editable de respaldo. Por defecto esta vacia porque los canales vienen de StreamX-HD.
- `script.js`: renderizado, cambio de canales y fullscreen.
- `netlify/functions/worldcup-games.js`: proxy de marcador y resultados World Cup.
- `netlify/functions/streamx-events.js`: proxy de agenda StreamX-HD.
- `netlify/functions/streamx-channels.js`: proxy de canales 24/7 StreamX-HD.

El embed manual acepta URLs directas o iframes con `src`.

## Modos

- `PC`: modo por defecto en computadora. Abre el player sin fullscreen automatico y deja el iframe libre para mouse/teclado.
- `TV`: intenta fullscreen al reproducir y activa un overlay para que el control remoto no lo robe el iframe.
- En `TV`, el inicio enfoca eventos/canales y se navega con flechas.
- Puedes forzar modo con `?mode=pc` o `?mode=tv`.
- En Android TV/Xiaomi TV Box se detectan teclas D-pad por `key`, `code` y `keyCode`.
- Si el navegador no reporta bien el dispositivo, al detectar un control remoto se activa modo TV automaticamente.
- Para diagnosticar un control remoto, abre `?debugRemote=1` y pulsa botones: se vera `key`, `code`, `keyCode` y accion normalizada.

## Datos y actualizacion

- Marcador, estado y resultados: `worldcup26.ir/get/games`.
- Canales por evento: `streamx-hd.com/eventos.json`.
- Canales 24/7: `streamx-hd.com/canales/canales.json`.
- Marcador: se actualiza cada 30 segundos si hay partido en vivo, cada 60 segundos si un partido esta por empezar y cada 5 minutos en reposo.
- Servidores de agenda: se actualizan cada 2 minutos.
- Canales 24/7: se actualizan cada 10 minutos.
- La agenda se pinta apenas llega StreamX-HD; el marcador World Cup solo enriquece los partidos del Mundial que ya vengan en StreamX-HD.
- Por defecto se muestran solo los eventos del dia seleccionado. Si hoy no hay eventos, se abre el proximo dia disponible.
- Al volver a la pestana o app, solo se actualizan las fuentes que ya esten vencidas.
- El boton `Actualizar agenda` fuerza una lectura nueva y evita el cache normal.

## Teclado

- `ArrowRight`, `PageDown` o `N`: siguiente fuente.
- `ArrowLeft`, `PageUp` o `P`: fuente anterior.
- `C`: abrir/cerrar canales.
- `F`: pantalla completa.
- `T`: alternar modo PC/TV.
- `I`: en modo TV, liberar o recuperar el control del iframe.
- `E`: atras.
- `Esc`, `Backspace` o boton Back del control remoto: atras.
- `OK`/`Enter`: en TV abre canales o selecciona el canal enfocado.
- `Menu`: abre/cierra canales en TV.
- `ChannelUp`/`ChannelDown`: siguiente/anterior fuente cuando el control lo soporta.

En modo TV, la navegacion usa foco espacial: las flechas saltan al boton visualmente mas cercano en esa direccion.

## Instalacion como app TV

- La pagina incluye `manifest.webmanifest` con `display: fullscreen`, `orientation: landscape` y `start_url` en modo TV.
- En Android TV/Google TV, usa la opcion del navegador para anadir o fijar la pagina si esta disponible.

## Netlify

La carpeta ya incluye `netlify.toml`. Sube esta carpeta como sitio estatico. Netlify publicara `.` y usara `netlify/functions` para los proxies StreamX-HD.
