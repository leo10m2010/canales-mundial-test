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
- Recuperación del WebView cuando Android elimina el proceso de render por memoria.
- Identidad `M+` compartida por cold start, loader, launcher y banner de Android TV.
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

El workflow `Android TV APK` ejecuta tests, lint y compilación debug cuando cambia
Android o la experiencia web que carga la app. La APK se conserva durante 30 días
como el artifact `mundial-plus-android-tv-debug`.

La versión actual es `5.1` (`versionCode 10`). El release usa R8, elimina recursos
sin uso y se firma con una llave RSA de 4096 bits.

## Release firmada

El workflow `Android TV Signed Release` usa el environment protegido
`android-tv-release` y estos secretos:

```text
ANDROID_RELEASE_KEYSTORE_BASE64
ANDROID_RELEASE_STORE_PASSWORD
ANDROID_RELEASE_KEY_ALIAS
ANDROID_RELEASE_KEY_PASSWORD
```

Puede ejecutarse manualmente o con un tag `android-tv-v<versionName>`. Verifica la
firma y su certificado antes de crear una release inmutable con APK y SHA-256. Para
una nueva versión hay que incrementar `versionCode` y `versionName`; una release
existente nunca se sobrescribe.

La copia local de recuperación vive en `android-tv/.signing/`, está ignorada por
Git y debe respaldarse en un lugar seguro. Si se pierde esta llave no será posible
actualizar instalaciones de producción. La antigua APK debug `5.0` debe
desinstalarse una única vez antes de instalar la primera APK firmada.

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
