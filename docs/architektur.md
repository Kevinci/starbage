# Architektur

Nuxt 3 als reine SPA (`ssr: false`). Die ganze 3D-Szene hängt an einer globe.gl-Instanz
(three.js darunter), die in `pages/index.vue` erzeugt wird.

## Wo was liegt

| Pfad | Aufgabe |
| --- | --- |
| `pages/index.vue` | Globus und fast alle Szenenobjekte: Sonne, Tag/Nacht-Shader, Sterne, Wolken, Mond, Satelliten, Trümmerwolke, ISS |
| `composables/useStarlinkConstellation.ts` | Rund 950 Starlink-Satelliten in drei Schalen, als InstancedMeshes |
| `composables/useCollectorShip.ts` | Abfangschiff mit Schrott auf seiner Bahn, siehe [abfangschiff.md](abfangschiff.md) |
| `composables/collectorTextures.ts` | Zur Laufzeit gezeichnete Texturen für Schiff und Schrott |
| `composables/useAssetPath.ts` | Pfade zu `public/` relativ zur Base-URL, **immer** benutzen (GitHub Pages läuft unter `/<repo>/`) |
| `stores/globeStore.ts` | Ansichts-Flags: `followISS`, `followShip`, `showSatellites`, `showStarlink` (Starlink ist standardmäßig aus) |
| `stores/modalStore.ts` | Welche Dialoge offen sind |
| `components/Navbar.vue` | Schmale Leiste mit drei Menüs (Informationen, Anzeigen, Kamera); die Einträge setzen nur Store-Flags oder öffnen Dialoge, die Umsetzung passiert in `pages/index.vue` |
| `i18n.config.ts.ts` | Alle Texte DE/EN (Dateiname wirklich mit doppeltem `.ts`) |
| `public/` | Texturen, ISS-Modell (`ISS_stationary.glb`), TLE-Daten (`data.txt`), Logo |

## Ablauf in `pages/index.vue`

`onMounted` ruft `initGlobe`, `fetchSatelliteData`, `startFrameTicker` und `getSpaceDebris`.
`initGlobe` erzeugt den Globus und hängt danach alles Weitere an die Szene
(`setupEnvironment`, `addSun`, `startStarlinkConstellation`, `startCollectorShip`, `addStars`, …).

Jedes Objekt hat seine eigene `requestAnimationFrame`-Schleife, die bei `isRunning === false`
abbricht (gesetzt in `onUnmounted`). Intervalle kommen in das Array `intervals`.
Neue Animationen folgen demselben Muster.

## Maßstab und Koordinaten

- Globusradius ist 100 Einheiten (`world.getGlobeRadius()`), Erdradius 6371 km.
- Bahnhöhen sind überhöht (`…AltitudeExaggeration`), sonst klebt alles am Globus.
- Das Abfangschiff nutzt eine Gruppe `orbit`, die die Bahnebene kippt (Inklination, RAAN), und
  eine Kindgruppe, die sich darin um +Z dreht.
- Starlink rechnet dieselbe Lage als Matrix pro Satellit: Bahnebene erst in den Äquator legen
  (Pol des Globus ist +Y), dann um die Knotenlinie neigen und um den Pol drehen.
- Die ISS kommt live von wheretheiss.at, alle 3,5 s. Dazwischen wird ihre Position interpoliert.

## Kamera

globe.gl nutzt OrbitControls. Die Kamera zielt normalerweise auf den Erdmittelpunkt
(`controls.target = 0,0,0`), `pointOfView({ lat, lng, altitude }, ms)` fliegt sie an.

- **ISS folgen** (`followISS`): `pointOfView` auf die ISS-Position, jedes Frame nachgeführt.
- **Schiff folgen** (`followShip`): `controls.target` wandert mit dem Schiff, siehe
  [abfangschiff.md](abfangschiff.md#mitflug-kamera).
- ISS, Mitfliegen und Spielmodus schließen sich im Store gegenseitig aus. `autoRotate` ist nur
  an, wenn nichts davon aktiv ist.
- Die Zoom-Grenze nach unten setzt globe.gl selbst (knapp über der Oberfläche, abhängig von
  `camera.near`), ebenso Zoom- und Drehgeschwindigkeit passend zur Höhe.

## Satellitenkarte

`startSatelliteMap` in `pages/index.vue` legt zwei eigene Kachel-Ebenen aus
`three-slippy-map-globe` in die Szene: Esri World Imagery und knapp darüber Esris Beschriftung
(`Reference/World_Boundaries_and_Places`, transparente PNGs, bis Zoomstufe 18). Die eingebaute
Tile-Engine von globe.gl wird bewusst nicht genutzt, weil sie die eigene Erde hart ausblendet.

Pro Frame, abhängig von der Kamerahöhe (in Globus-Radien):

- Unter `tilesLoadBelowAltitude` werden die Kacheln geladen, noch verdeckt von der eigenen Erde,
  die dafür eine Spur größer skaliert ist.
- Zwischen `blendStartAltitude` und `blendEndAltitude` blendet die eigene Erde über die Uniform
  `globeOpacity` des Tag/Nacht-Shaders aus. Wolken und Beschriftung blenden mit, und ein
  Dunst-Overlay (`hazeOpacity`) ist in der Mitte des Übergangs am dichtesten.
- Die Auto-Rotation wird dort ebenfalls gesetzt: langsamer mit sinkender Höhe, aus über der
  Karte und solange eine Kamera ISS oder Schiff folgt. Nirgends sonst `autoRotate` setzen.
- Bei der Beschriftung ist nur die aktuelle Zoomstufe sichtbar (Stufe aus der Kachelbreite),
  sonst stünden Namen aus der gröberen Stufe doppelt darunter.

Die Quellenangabe für Esri erscheint unten rechts, sobald die Karte überwiegt.
