# Starbage

Ein interaktiver 3D-Globus, der zeigt, was im Erdorbit unterwegs ist: die ISS in Echtzeit,
Satellitenbahnen aus TLE-Daten, eine simulierte Trümmerwolke und eine Starlink-Kette.

> **Starbage ist ein fiktives Projekt.** Es gibt keine Organisation, keine Mission und keine
> Aufräumsatelliten dahinter. Die Seite will nur darauf aufmerksam machen, wie voll der Orbit ist.
> Details dazu im Dialog "Über Starbage" in der App.

Gebaut mit Nuxt 3 (SPA, `ssr: false`), three.js / globe.gl, Pinia, Tailwind CSS und `@nuxtjs/i18n` (DE/EN).

## Datenquellen

| Quelle | Verwendung | Echt? |
| --- | --- | --- |
| [wheretheiss.at](https://wheretheiss.at/) | Live-Position der ISS | ja |
| `public/data.txt` (TLE) | Satellitenbahnen, propagiert mit `satellite.js` | ja |
| [The Space Devs](https://thespacedevs.com/) | Personen im All | ja |
| generiert im Client | Trümmerwolke und Starlink-Kette | nein, erfundene Koordinaten |

Größen und Bahnhöhen sind stark überzeichnet - maßstabsgetreu wäre kein Objekt sichtbar.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:3000
```

## Statischer Build

```bash
npm run generate                                  # Ausgabe in .output/public (bzw. ./dist)
NUXT_APP_BASE_URL=/starbage/ npm run generate     # so wie GitHub Pages es braucht
npx serve .output/public
```

## Deployment auf GitHub Pages

`.github/workflows/deploy-pages.yml` baut die Seite bei jedem Push auf `master` und
veröffentlicht sie über GitHub Pages. Damit das greift, muss im Repository einmalig
**Settings → Pages → Build and deployment → Source** auf **GitHub Actions** stehen.

Was der Workflow berücksichtigt:

- `NUXT_APP_BASE_URL` wird aus `actions/configure-pages` gesetzt, weil Project Pages unter
  `/<repo>/` liegen. Alle Asset-Pfade laufen deshalb über `composables/useAssetPath.ts`.
- `app.buildAssetsDir` ist `nuxt` statt `_nuxt`, zusätzlich liegt eine `.nojekyll` im Output -
  Jekyll würde Ordner mit führendem Unterstrich sonst verwerfen.
- Es gibt keinen Server: `nuxt-security` und `nuxt-proxy` sind entfernt, alle externen APIs
  werden direkt per HTTPS aus dem Browser abgefragt.
