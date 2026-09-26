# Starbage

Arbeitsnotizen zu Aufbau, Konventionen und Stolperfallen liegen in [docs/](docs/README.md).
Vor größeren Änderungen dort nachlesen und neue Erkenntnisse dort nachtragen.

- Jedes Feature der 3D-Szene ist ein eigenes Modul in `scene/`; `pages/index.vue` verdrahtet
  sie nur. Neue Features ebenso als eigenes Modul anlegen (siehe docs/architektur.md).
- Abhängigkeiten mit `npm ci` installieren, nicht mit `npm install` (siehe docs/stolperfallen.md).
- Code-Kommentare und UI-Texte sind deutsch, Texte immer in DE und EN.
