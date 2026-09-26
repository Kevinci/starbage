import Globe from 'globe.gl';
import type { GlobeInstance } from 'globe.gl';

/**
 * Grundaufbau des Globus: Tagtextur, Atmosphäre, Objekt-Layer für die TLE-Satelliten
 * und der Standort-Pin. Alles Weitere hängen die anderen Szenen-Module an.
 */

const markerSvg = `<svg viewBox="-4 0 36 36">
      <path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path>
      <circle fill="black" cx="14" cy="14" r="7"></circle>
    </svg>`;

interface GlobeOptions {
    asset: (path: string) => string;
    onReady: () => void;
}

export const createGlobe = (container: HTMLElement, { asset, onReady }: GlobeOptions): GlobeInstance => {
    const world = Globe({ waitForGlobeReady: true, animateIn: false })(container)
        .globeImageUrl(asset('earth_day_hires.jpg'))
        .objectLat('lat')
        .objectLng('lng')
        .objectAltitude('alt')
        .objectFacesSurface(true)
        .objectLabel('name')
        .atmosphereAltitude(0.12)
        .onGlobeReady(onReady)
        // Position ist beim Start noch unbekannt - der Pin bleibt deshalb bisher unsichtbar
        .htmlElementsData([{ lat: undefined, lng: undefined }])
        .htmlElement(d => {
            const el = document.createElement('div');
            el.innerHTML = markerSvg;
            el.style.color = 'blue';
            el.style.width = `24px`;

            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';
            el.onclick = () => console.info(d);
            return el;
        });

    // Heranzoomen bis knapp über die Oberfläche setzt globe.gl selbst (minDistance, dazu
    // Zoom- und Drehgeschwindigkeit passend zur Höhe) - hier nur nicht ins Nichts
    const controls = world.controls();
    controls.enableZoom = true;
    controls.maxDistance = world.getGlobeRadius() * 8;

    return world;
};
