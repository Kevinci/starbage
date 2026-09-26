# Architektur

Nuxt 3 als reine SPA (`ssr: false`). Die ganze 3D-Szene hängt an einer globe.gl-Instanz
(three.js darunter). Jedes Feature der Szene ist ein eigenes Modul in `scene/`,
`pages/index.vue` steckt sie nur zusammen und verbindet sie mit den Stores.

## Wo was liegt

| Pfad | Aufgabe |
| --- | --- |
| `pages/index.vue` | Template (Zähler, Dunst, Quellenangabe, Hinweis, Dialoge) und das Verdrahten der Szenen-Module mit den Stores |
| `scene/context.ts` | `SceneContext` (globe.gl-Instanz, `asset`, `isRunning`), den bekommt jedes Modul; `EARTH_RADIUS_KM` |
| `scene/globe.ts` | Grundaufbau des Globus: Tagtextur, Atmosphäre, Objekt-Layer, Standort-Pin, Zoom-Grenze nach außen |
| `scene/sunPosition.ts` | Subsolarer Punkt zur aktuellen Uhrzeit |
| `scene/sun.ts` | Sonnenscheibe, Halo und Sonnenlicht in der echten Richtung |
| `scene/dayNight.ts` | Tag/Nacht-Shader des Globus, blendet beim Übergang zur Satellitenkarte aus |
| `scene/environment.ts` | Environment-Map für PBR-Materialien (ISS) |
| `scene/stars.ts`, `scene/moon.ts`, `scene/clouds.ts` | Sternhimmel, Mond, Wolkenschicht |
| `scene/debrisCloud.ts` | Simulierte Trümmerwolke (rote Punkte) |
| `scene/satellites.ts` | Echte Satelliten aus `public/data.txt` |
| `scene/userLocation.ts` | Kamera auf den Standort, Standortkegel |
| `scene/iss.ts` | ISS live von wheretheiss.at und die ISS-Kamera |
| `scene/satelliteMap.ts` | Satellitenkarte und Beschriftung beim Heranzoomen, liefert pro Frame den Überblendwert |
| `scene/autoRotation.ts` | Auto-Rotation abhängig von Höhe, Karte und Kamera-Modus |
| `scene/starlink.ts` | Rund 950 Starlink-Satelliten in drei Schalen, als InstancedMeshes |
| `scene/collectorShip.ts` | Abfangschiff mit Schrott auf seiner Bahn, siehe [abfangschiff.md](abfangschiff.md) |
| `scene/collectorTextures.ts` | Zur Laufzeit gezeichnete Texturen für Schiff, Schrott und Starlink |
| `composables/useSteerKeyboard.ts` | Tastatur für den Spielmodus (WASD/Pfeile, Esc) und der Hinweis dazu |
| `composables/useAssetPath.ts` | Pfade zu `public/` relativ zur Base-URL, **immer** benutzen (GitHub Pages läuft unter `/<repo>/`) |
| `stores/globeStore.ts` | Ansichts-Flags: `followISS`, `followShip`, `showSatellites`, `showStarlink` (Starlink ist standardmäßig aus) |
| `stores/modalStore.ts` | Welche Dialoge offen sind |
| `components/Navbar.vue` | Schmale Leiste mit drei Menüs (Informationen, Anzeigen, Kamera); die Einträge setzen nur Store-Flags oder öffnen Dialoge, die Umsetzung passiert in `pages/index.vue` |
| `i18n.config.ts.ts` | Alle Texte DE/EN (Dateiname wirklich mit doppeltem `.ts`) |
| `public/` | Texturen, ISS-Modell (`ISS_stationary.glb`), TLE-Daten (`data.txt`), Logo |

## Ablauf in `pages/index.vue`

`onMounted` ruft `initScene`: Globus erzeugen, `SceneContext` bauen, dann die Module anlegen.
Module, die später gesteuert werden, geben ein kleines Objekt zurück (`createX` →
`{ update, setVisible, setFollow, … }`), reine Deko heißt `addX` und gibt nichts zurück.
Ein Intervall (`sceneTickMs`) aktualisiert alle 3 s Sonnenstand und Satellitenpositionen.
Die Satellitenkarte meldet pro Frame Höhe und Überblendwert, `index.vue` reicht das an
Tag/Nacht-Globus, Wolken, Standortkegel und Auto-Rotation weiter.

Jedes Modul hat seine eigene `requestAnimationFrame`-Schleife, die bei `isRunning() === false`
abbricht (gesetzt in `onUnmounted`). Neue Features bekommen ein eigenes Modul in `scene/`
nach demselben Muster und werden in `initScene` angeschlossen.

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

`createSatelliteMap` in `scene/satelliteMap.ts` legt zwei eigene Kachel-Ebenen aus
`three-slippy-map-globe` in die Szene: Esri World Imagery und knapp darüber Esris Beschriftung
(`Reference/World_Boundaries_and_Places`, transparente PNGs, bis Zoomstufe 18). Die eingebaute
Tile-Engine von globe.gl wird bewusst nicht genutzt, weil sie die eigene Erde hart ausblendet.

Pro Frame, abhängig von der Kamerahöhe (in Globus-Radien):

- Unter `tilesLoadBelowAltitude` werden die Kacheln geladen, noch verdeckt von der eigenen Erde,
  die dafür eine Spur größer skaliert ist (`dayNight.setMapBlend`).
- Zwischen `blendStartAltitude` und `blendEndAltitude` blendet die eigene Erde über die Uniform
  `globeOpacity` des Tag/Nacht-Shaders aus. Wolken und Beschriftung blenden mit, und ein
  Dunst-Overlay (`haze` im Frame) ist in der Mitte des Übergangs am dichtesten.
- Die Auto-Rotation (`scene/autoRotation.ts`) bekommt Höhe und Überblendwert: langsamer mit
  sinkender Höhe, aus über der Karte und solange eine Kamera ISS oder Schiff folgt. Nirgends
  sonst `autoRotate` setzen.
- Bei der Beschriftung ist nur die aktuelle Zoomstufe sichtbar (Stufe aus der Kachelbreite),
  sonst stünden Namen aus der gröberen Stufe doppelt darunter.

Die Quellenangabe für Esri erscheint unten rechts, sobald die Karte überwiegt.
