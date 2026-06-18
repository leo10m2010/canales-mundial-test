# Player Embed

Abre la pagina con servidor local para evitar bloqueos de seguridad de `file://`.

## Windows

Ejecuta `start-server.bat` y abre:

```text
http://localhost:8080
```

Si un embed sigue sin cargar, normalmente es porque el sitio bloquea iframes o porque una extension del navegador bloquea scripts del propio embed.

## Estructura

- `index.html`: estructura de la pagina.
- `styles.css`: interfaz, player y responsive.
- `channels.js`: lista editable de canales.
- `script.js`: renderizado, cambio de canales y fullscreen.

El embed manual acepta URLs directas o iframes con `src`.

## Teclado

- `ArrowRight`, `PageDown` o `N`: siguiente fuente.
- `ArrowLeft`, `PageUp` o `P`: fuente anterior.
- `C`: abrir/cerrar canales.
- `F`: pantalla completa.
- `E`: cambiar embed / volver al inicio.
- `Esc`: cerrar panel de canales o salir del player.

## Netlify

La carpeta ya incluye `netlify.toml`. Sube esta carpeta como sitio estatico y usa `publish = "."`.
