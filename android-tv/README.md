# Mundial+ para Android TV

La aplicación Android TV muestra directamente la experiencia oficial de
`https://mundialplus.netlify.app/?mode=tv`. De esta forma la portada, agenda,
imágenes, colores, player y selector de canales se mantienen idénticos a la web.

`MainActivity` añade la integración que no ofrece un navegador convencional:

- Modo inmersivo y orientación horizontal.
- D-pad, OK, Menu, Channel Up/Down y controles multimedia traducidos al modo TV.
- En las tarjetas de eventos, el D-pad enfoca directamente `Ver transmisión` y
  omite estrellas y acciones secundarias.
- Android activa autoplay dentro del reproductor StreamX antes de inicializar
  Clappr, sin depender de un clic sobre el iframe.
- OK o Menu abre la barra lateral. Las cuatro flechas recorren sus herramientas,
  OK activa la seleccionada y Back/Menu cierra el menú. Canales sigue disponible
  como la primera herramienta.
- Fuera del menú, la barra y la ayuda desaparecen tras tres segundos sin actividad.
- El billboard usa la imagen del evento y tiene un fondo local garantizado cuando
  una imagen o vista previa externa no es compatible con Android TV.
- Las herramientas activan directamente sus handlers web después de fijar el modo
  de navegación, evitando que una pulsación rápida vuelva al selector de canales.
- Back cierra primero los paneles/player de la web y después minimiza la app.
- Fullscreen nativo para contenido que lo solicite.
- Caché HTTP, almacenamiento local y cookies para conservar preferencias.
- Pantalla de carga nativa con progreso real y límite de espera de 20 segundos.
- Pantalla nativa de reconexión enfocable cuando falla la carga principal.
- Navegación principal restringida al dominio oficial.
- Descargas StreamX limitadas a HTTPS, HTML válido y un máximo de 2 MB.

## Compilar

```powershell
.\gradlew.bat assembleDebug
```

APK:

```text
app\build\outputs\apk\debug\app-debug.apk
```

El workflow `Android TV APK` de GitHub Actions ejecuta tests, lint y compilación
cuando cambia `android-tv/`. La APK se publica durante 30 días como el artifact
`mundial-plus-android-tv-debug`.

La versión actual es `5.0` (`versionCode 9`). El release usa R8 y elimina recursos
sin uso.

## Emulador de Android Studio

Inicia un dispositivo Android TV desde Device Manager y ejecuta la configuración
`app`. El emulador se conecta directamente a Mundial+ por HTTPS; no requiere un
televisor físico ni configurar una conexión ADB externa.

Controles principales:

```text
Flechas: navegar por la interfaz y cambiar fuentes en el player
OK/Enter: activar la opción enfocada
Menu: abrir o cerrar la barra de herramientas
Channel Up/Down: cambiar canal
Back: cerrar selector, vista doble o player; en Inicio minimiza la app
```
