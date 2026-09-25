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

## Satellitenkacheln

Unter etwa 2100 km Kamerahöhe (`tilesOnBelowAltitude`) schaltet `updateSatelliteTiles` in
`pages/index.vue` den Kachel-Layer von globe.gl ein (`globeTileEngineUrl`, Esri World Imagery,
bis Zoomstufe 18). Darüber ist er aus, dann ist wieder der eigene Tag/Nacht-Shader zu sehen.
Zwischen Ein- und Ausschalten liegt etwas Abstand, damit es an der Grenze nicht flackert.
Solange die Kacheln aktiv sind, sind Wolken und Standortkegel ausgeblendet und unten rechts
steht die Quellenangabe, die Esri verlangt. Ausgelöst wird das über `onZoom`.
