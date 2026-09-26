# Abfangschiff

Erfundenes Schiff, das auf einer eigenen Bahn Weltraumschrott mit einem Netz einsammelt.
Alles simuliert, keine echten Koordinaten. Code in `scene/collectorShip.ts`,
Texturen in `scene/collectorTextures.ts`, Tastatur in `composables/useSteerKeyboard.ts`.

## Schnittstelle

```ts
const { collected, start, follow, setCameraMode, steer } = createCollectorShip();

start({ world, earthRadiusKm, solarTextureUrl, logoUrl, isRunning: () => isRunning });
setCameraMode('follow');                // Kamera fliegt zum Schiff und bleibt dran
setCameraMode('steer');                 // Spielmodus mit Verfolgerkamera
setCameraMode('off', returnToGlobe);    // zurück; ohne returnToGlobe bleibt die Kamera stehen
steer(x, y);                            // Tasteneingabe: x +1 rechts, y +1 hoch (Bildschirm)
```

`follow(on)` gibt es weiter als Kurzform für `'follow'`/`'off'`. In `pages/index.vue` bestimmt
der Getter `globeStore.shipCameraMode` den Modus. Die Tastatur (WASD/Pfeile, Esc) wertet
`useSteerKeyboard` aus und reicht sie per `steer()` weiter.

`collected` ist ein Ref mit der Zahl eingefangener Teile. Die Anzeige unten links in
`pages/index.vue` liest es.

## Koordinaten des Schiffs

Das Modell wird in Schiffskoordinaten gebaut, ungefähr in ISS-Größe (rund 25 Einheiten):

- **+X** ist die Nase bzw. Flugrichtung, das Netz öffnet sich nach vorne (Ring bei x = 15).
- **+Y** zeigt zur Erde, **-Y** von ihr weg. Das ergibt sich aus `ship.rotation.z = π/2` im Pivot.
- **±Z** geht zu den Seiten, dort sitzen die Solarflügel.

`netMouth` und `netInside` sind die Punkte, an denen der Fang erkannt bzw. das Teil
hineingezogen wird. Wer das Netz verschiebt, muss beide anpassen.

## Schrott und Fang

- 40 Teile in vier Sorten (Brocken, Paneltrümmer, Raketenstufe, toter Kleinsatellit), jedes
  mit eigenen Materialien, damit es beim Fang einzeln aufleuchten kann.
- Die Teile liegen in der `orbit`-Gruppe, nicht im Pivot. Sie driften langsamer als das
  Schiff, das sie deshalb einholt.
- Zustände: `drifting` → `capturing` (0,9 s ins Netz ziehen, schrumpfen, aufleuchten) → `gone`
  (4–9 s warten) → `spawning` (irgendwo auf der Bahn einblenden) → `drifting`.
- Ein Fang beginnt, wenn ein Teil näher als `captureRadius` an `netMouth` ist. Deshalb
  müssen `radialOffset` und `lateralOffset` klein genug bleiben, dass das Teil durchs Netz passt.
- Alle Zeiten laufen über `THREE.Clock`, also unabhängig von der Bildrate.

## Texturen

`createCollectorSurfaces()` zeichnet beim Start alle Oberflächen auf Canvas. Jede liefert
`map`, `bumpMap` (hell = erhaben) und `roughnessMap` (hell = matt). `surfaceMaterial()` setzt
dafür `roughness: 1`, weil dieser Wert die Rauheitstextur nur noch multipliziert.

- `withRepeat(surface, x, y)` klont Texturen mit anderem Maßstab, z. B. für das kurze
  Kommandomodul, damit die Platten nicht gestaucht werden.
- Voll metallische Materialien wirken ohne Umgebung zum Spiegeln schwarz. Goldfolie und
  Solarpanele haben deshalb etwas Eigenleuchten (`emissiveMap`).
- Das Logo (`public/logo.png`) ist weiß auf transparentem Grund. Es sitzt deshalb auf einer
  dunklen Plakette auf den Radiatorfinnen, auf der +Z-Seite, die die Mitflug-Kamera sieht.

## Mitflug-Kamera

`followState` ist `off`, `flying` oder `on`. Pro Frame, im selben `step()`, der das Schiff bewegt:

1. Bei `on`: Kameraposition **vor** dem Weiterbewegen in Schiffskoordinaten umrechnen.
   Dadurch bleiben Drehen und Zoomen des Nutzers erhalten.
2. Schiff weiterbewegen.
3. Kamera aus diesen Schiffskoordinaten zurück in die Welt rechnen, `controls.target` auf
   `followLookAt` setzen.

Bei `flying` wird 1,8 s lang zwischen der Startlage der Kamera und `followOffset` gemischt,
ebenfalls in Schiffskoordinaten. So fliegt die Kamera weich an, obwohl das Schiff sich bewegt.
Beim Beenden werden `controls.target` sowie Min- und Max-Distanz zurückgesetzt.

In `pages/index.vue` muss der `shipCameraMode`-Watcher **vor** dem `followISS`-Watcher stehen.
Beim Wechsel Schiff → ISS löst sich die Kamera sonst nicht rechtzeitig vom Schiff.

## Spielmodus

- Das Schiff fliegt weiter automatisch vorwärts. Der Nutzer verschiebt es in einem Korridor
  um die Bahn: `corridorHalfWidth` quer (Schiff-Z) und `corridorHalfHeight` radial.
- Lenkung über Sollgeschwindigkeit plus Glättung (`steerResponse`), am Korridorrand wird
  gestoppt. Außerhalb des Spielmodus gleitet das Schiff zur Bahnmitte zurück.
- Das Schiff rollt in die Kurve und nickt beim Steigen/Sinken. Dafür hat es
  `rotation.order = 'ZYX'`: `rotation.x` rollt um die eigene Längsachse, `rotation.z` ist
  Grunddrehung plus Nicken.
- Die Verfolgerkamera hängt an `cameraRig`, einem zweiten Objekt im Pivot, das dem Schiff
  verzögert folgt (`steerCameraLag`). `camera.up` zeigt im Spielmodus von der Erde weg,
  sonst wäre links/rechts auf dem Bildschirm je nach Bahnposition verdreht. Beim Verlassen
  wird `camera.up` auf (0, 1, 0) zurückgesetzt, und `controls.enabled` ist im Spielmodus aus.
- Bildschirm rechts ist Schiff **-Z**, Bildschirm oben ist Schiff **-Y** (von der Erde weg).
- Der Schrott wird beim Wechsel in den Korridor verteilt (nur Teile weit weg vom Schiff).
  Zusätzlich gibt es `gameDebrisCount` Teile, die nur im Spielmodus unterwegs sind und sonst
  als `parked` unsichtbar bleiben. Die Fangzone ist im Spiel kleiner (`steerCaptureRadius`),
  man muss also wirklich treffen.
