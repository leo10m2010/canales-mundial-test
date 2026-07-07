# Canales Mundial TV para Android TV

App Android TV hibrida nativa para `canal-mundi-2026`.

La pantalla principal no carga toda la web en un WebView. Usa una grilla Android nativa, boot screen propio, estado online/offline/cache y foco diseñado para control remoto. El WebView solo se usa dentro del player al abrir una fuente.

## Arquitectura

```text
MainActivity.java      Pantalla nativa TV con grilla de canales
PlayerActivity.java    Player fullscreen con WebView por fuente
Channel.java           Modelo de canal
ChannelSource.java     Modelo de fuente
ChannelRepository.java Lee res/raw/channels.json
CacheStore.java        Guarda la ultima respuesta valida de Netlify
ConnectivityHelper.java Detecta internet/offline
TvStyle.java           Colores, fondos y helpers visuales
res/raw/channels.json  Lista local tomada de channels.js
```

Al abrir, la app pinta primero los canales locales y luego intenta cargar:

```text
https://canal-mundi-2026.netlify.app/.netlify/functions/streamx-channels
https://canal-mundi-2026.netlify.app/.netlify/functions/streamx-events
```

Los canales 24/7 aparecen en `Canales 24/7 Stream-XHD`. Los eventos del Mundial con servidores aparecen en `Agenda Mundial 2026`. La app muestra los partidos de hoy si existen; si no hay partidos hoy, muestra la proxima fecha disponible con fuentes.

Cuando la agenda trae fuentes `streamhdx.xyz`, la app las prioriza sobre fuentes `live1` y las etiqueta como `HD 1080` en el selector de fuentes. No se inventan URLs: solo se usan fuentes que llegan desde las APIs o desde `channels.json`.

Si no hay internet, la app abre igual con `channels.json` y, si existe, la ultima cache guardada. La reproduccion de una fuente si requiere internet.

## Controles

Pantalla principal:

```text
Flechas: navegar canales
OK/Enter: abrir canal
Menu: actualizar Netlify si hay internet
Back: mandar app al fondo
```

Player:

```text
Back: cerrar vista doble si esta activa; si no, volver a la grilla
Menu: abrir/cerrar selector de fuentes y acciones de ventana
ChannelUp: siguiente canal o partido de la misma seccion
ChannelDown: canal o partido anterior de la misma seccion
Vista doble: abrir segunda ventana desde el menu del player
Arriba/Abajo: cambiar ventana activa cuando la vista doble esta abierta
OK/Flechas: se envian al WebView o al selector si esta abierto
```

Estados del player:

```text
Cargando fuente: overlay nativo mientras carga WebView
Sin conexion: error nativo con Reintentar / Volver
Fuente lenta o fallida: Reintentar / Siguiente fuente / Volver
Fuente lenta o fallida con playlist: Reintentar / Siguiente fuente / Siguiente canal / Volver
```

## Compilar

Desde esta carpeta:

```powershell
.\gradlew.bat assembleDebug
```

APK generada:

```text
app\build\outputs\apk\debug\app-debug.apk
```

## Instalar en Android TV

Por ADB:

```powershell
adb connect IP_DEL_TV:5555
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
adb shell monkey -p com.leo10m2010.canalesmundialtv 1
```

O copia `app-debug.apk` a un USB e instalala desde el TV Box.

## Probar control remoto por ADB

```powershell
adb shell input keyevent 19
adb shell input keyevent 20
adb shell input keyevent 21
adb shell input keyevent 22
adb shell input keyevent 23
adb shell input keyevent 4
adb shell input keyevent 82
adb shell input keyevent 166
adb shell input keyevent 167
```

## Notas

- La app usa `LEANBACK_LAUNCHER`, por eso aparece en el launcher de Android TV.
- `MainActivity` es nativa; no depende de `https://canal-mundi-2026.netlify.app/?mode=tv` para pintar el menu.
- `PlayerActivity` abre directamente la URL de la fuente seleccionada.
- Los flags se muestran como insignias por pais cuando el API trae `country`; `GL` indica global y `CUP` indica evento del Mundial.
- Los partidos de la agenda muestran banderas de ambos equipos cuando el nombre del equipo se puede mapear a pais.
- Si las APIs fallan, la app queda usable con los canales locales incluidos en `res/raw/channels.json`.
- La ultima respuesta valida de Netlify queda guardada en cache para abrir la app aunque no haya internet.
- Ninguna pantalla usa botones Android default para la UX principal; las cards, acciones y filas tienen fondos/foco custom.
- No se modifica ni evade ninguna restriccion de terceros. Si un embed bloquea WebView, DRM, iframe, fullscreen o permisos, se debe respetar ese bloqueo.
