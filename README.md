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
- `channels.js`: lista editable de canales.
- `script.js`: renderizado, cambio de canales y fullscreen.
- `netlify/functions/worldcup-games.js`: proxy de marcador y resultados World Cup.
- `netlify/functions/streamx-events.js`: proxy de agenda Stream-XHD.
- `netlify/functions/streamx-channels.js`: proxy de canales 24/7 Stream-XHD.

El embed manual acepta URLs directas o iframes con `src`.

## Modos

- `PC`: modo por defecto en computadora. Abre el player sin fullscreen automatico y deja el iframe libre para mouse/teclado.
- `TV`: intenta fullscreen al reproducir y activa un overlay para que el control remoto no lo robe el iframe.
- En `TV`, el inicio enfoca partidos/canales y se navega con flechas.
- Puedes forzar modo con `?mode=pc` o `?mode=tv`.

## Datos y actualizacion

- Marcador, estado y resultados: `worldcup26.ir/get/games`.
- Canales por partido: `stream-xhd.com/eventos.json`.
- Canales 24/7: `stream-xhd.com/canales/canales.json`.
- Marcador: se actualiza cada 30 segundos.
- Servidores de agenda: se actualizan cada 2 minutos.
- Canales 24/7: se actualizan cada 10 minutos.
- Al volver a la pestana o app, se fuerza una actualizacion de marcador y agenda.

## Teclado

- `ArrowRight`, `PageDown` o `N`: siguiente fuente.
- `ArrowLeft`, `PageUp` o `P`: fuente anterior.
- `C`: abrir/cerrar canales.
- `F`: pantalla completa.
- `T`: alternar modo PC/TV.
- `I`: en modo TV, liberar o recuperar el control del iframe.
- `E`: atras.
- `Esc`, `Backspace` o boton Back del control remoto: atras.

En modo TV, `Enter` abre el panel de canales y `ArrowUp`/`ArrowDown` enfocan la lista.

## Netlify

La carpeta ya incluye `netlify.toml`. Sube esta carpeta como sitio estatico. Netlify publicara `.` y usara `netlify/functions` para los proxies Stream-XHD.
