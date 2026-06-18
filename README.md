# Player Embed

Abre la pagina con servidor local para evitar bloqueos de seguridad de `file://`.

## Windows

Ejecuta `start-server.bat` y abre:

```text
http://localhost:8080
```

Si un embed sigue sin cargar, normalmente es porque el sitio bloquea iframes o porque una extension del navegador bloquea scripts del propio embed.

La agenda Stream-XHD usa Netlify Functions para evitar CORS. Con `start-server.bat` la biblioteca manual funciona, pero la agenda automatica puede no cargar hasta usar Netlify o Netlify CLI.

## Estructura

- `index.html`: estructura de la pagina.
- `styles.css`: interfaz, player y responsive.
- `channels.js`: lista editable de canales.
- `script.js`: renderizado, cambio de canales y fullscreen.
- `netlify/functions/streamx-events.js`: proxy de agenda Stream-XHD.
- `netlify/functions/streamx-channels.js`: proxy de canales 24/7 Stream-XHD.

El embed manual acepta URLs directas o iframes con `src`.

## Modos

- `PC`: modo por defecto en computadora. Abre el player sin fullscreen automatico y deja el iframe libre para mouse/teclado.
- `TV`: intenta fullscreen al reproducir y activa un overlay para que el control remoto no lo robe el iframe.
- Puedes forzar modo con `?mode=pc` o `?mode=tv`.

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
