# Stolperfallen

## Abhängigkeiten nur mit `npm ci` installieren

`npm install` kann neuere Versionen ziehen als die `package-lock.json` (z. B. Nuxt 3.21 statt 3.11).
`@nuxtjs/i18n` 8 passt nicht zu den neueren unhead-Versionen, die Seite bricht dann schon
beim Laden ab:

```
The requested module '.../unhead/dist/index.mjs' does not provide an export named 'getActiveHead'
```

Abhilfe: `npm ci`. Der Deploy-Workflow nutzt ebenfalls `npm ci`.

## Erster Seitenaufruf nach Neustart des Dev-Servers

Direkt nach dem Start des Dev-Servers kann der erste Aufruf mit einem Render-Fehler im Layout
scheitern, weil Vite die Abhängigkeiten noch vorbündelt. Einmal neu laden, dann läuft es.

## Pfade zu `public/`

Nie `'/foo.png'` schreiben, immer `useAssetPath()('foo.png')`. Auf GitHub Pages liegt die Seite
unter `/<repo>/`, absolute Pfade laufen dort ins Leere.

## Texte

Neue Texte gehören in **beide** Sprachblöcke (`de` und `en`) in `i18n.config.ts.ts`.

## Szene im Browser prüfen

Die globe.gl-Instanz ist nicht global erreichbar. Zum Prüfen mit Chrome DevTools kurzzeitig
in `initGlobe` einfügen:

```ts
(window as any).__dbgWorld = world.value; // TEMP-DEBUG
```

Danach kommt man per Skript an Szene, Kamera und Controls (`__dbgWorld.scene()`, `.camera()`,
`.controls()`). Die Zeile vor dem Commit wieder entfernen (`grep TEMP-DEBUG`).

Tipps:

- Objekte über ihre Geometrie finden, z. B. den Netzring des Schiffs:
  `o.geometry?.type === 'TorusGeometry' && o.geometry.parameters.radius === 3.4`.
- Kurze Ereignisse wie einen Fang für einen Screenshot einfrieren:
  `window.requestAnimationFrame = () => 0`. Alle Schleifen bleiben dann stehen, das letzte
  Bild bleibt sichtbar. Danach neu laden.
- Für die Mitflug-Ansicht einfach den Navbar-Button per Skript klicken, zoomen per
  `WheelEvent` auf das Canvas in `#chart`.

## Kamera-Grenzen

OrbitControls begrenzt den Abstand zu `controls.target` (`minDistance`, `maxDistance`). Wer das
Ziel vom Erdmittelpunkt wegbewegt, muss die Grenzen mit anpassen, sonst springt die Kamera.
