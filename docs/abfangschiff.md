# Abfangschiff

Erfundenes Schiff, das auf einer eigenen Bahn Weltraumschrott mit einem Netz einsammelt.
Alles simuliert, keine echten Koordinaten. Code in `composables/useCollectorShip.ts`,
Texturen in `composables/collectorTextures.ts`.

## Schnittstelle

```ts
const { collected, start, follow } = useCollectorShip();

start({ world, earthRadiusKm, solarTextureUrl, logoUrl, isRunning: () => isRunning });
follow(true);                // Kamera fliegt zum Schiff und bleibt dran
follow(false, returnToGlobe) // zurück; ohne returnToGlobe bleibt die Kamera stehen
```

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

In `pages/index.vue` muss der `followShip`-Watcher **vor** dem `followISS`-Watcher stehen.
Beim Wechsel Schiff → ISS löst sich die Kamera sonst nicht rechtzeitig vom Schiff.
