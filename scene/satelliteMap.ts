import * as THREE from 'three';
import SlippyMapGlobe from 'three-slippy-map-globe';
import type { SceneContext } from './context';

/**
 * Satellitenkarte beim Heranzoomen (wie Google Earth): Esri-Fotos und darüber Esris
 * Beschriftung als eigene Kachel-Ebenen. Pro Frame wird aus der Kamerahöhe ein
 * Überblendwert berechnet (0 = eigene Erde, 1 = nur noch Karte), den die anderen
 * Module über onFrame abgreifen - Tag/Nacht-Globus, Wolken, Standortkegel, Rotation.
 *
 * Die eingebaute Tile-Engine von globe.gl wird bewusst nicht genutzt, weil sie die
 * eigene Erde hart ausblendet.
 */

// Höhen in Globus-Radien (1 = 6371 km)
const tilesLoadBelowAltitude = 0.6; // Kacheln schon laden, solange die eigene Erde sie noch verdeckt
const tilesUnloadAboveAltitude = 0.7; // etwas höher, damit es an der Grenze nicht hin und her springt
const blendStartAltitude = 0.5; // ab etwa 3200 km blendet die eigene Erde aus ...
const blendEndAltitude = 0.3; // ... bis sie bei etwa 1900 km ganz der Satellitenkarte weicht
const satelliteTileMaxLevel = 18; // Häuserebene
const hazeStrength = 0.45;

export const hazeGradient = 'radial-gradient(ellipse at center, rgba(224, 242, 254, 0.75) 0%, rgba(125, 211, 252, 0.45) 55%, rgba(14, 116, 144, 0.3) 100%)';

const esriTileUrl = (service: string) => (x: number, y: number, level: number) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/${level}/${y}/${x}`;

export interface SatelliteMapFrame {
    altitude: number; // Kamerahöhe in Globus-Radien
    blend: number; // 0 = eigene Erde, 1 = nur noch Satellitenkarte
    tilesLoaded: boolean; // Kacheln liegen schon unter der eigenen Erde
    haze: number; // Deckkraft des Dunst-Overlays, mitten im Übergang am höchsten
}

interface SatelliteMapOptions {
    onFrame: (frame: SatelliteMapFrame) => void;
}

export const createSatelliteMap = ({ world, isRunning }: SceneContext, { onFrame }: SatelliteMapOptions) => {
    const radius = world.getGlobeRadius();
    const camera = world.camera();

    const imagery = new SlippyMapGlobe(radius, {
        tileUrl: esriTileUrl('World_Imagery'),
        maxLevel: satelliteTileMaxLevel
    });
    // Knapp über den Fotos, damit sich beide Ebenen nicht flackernd durchdringen
    const labels = new SlippyMapGlobe(radius * 1.00001, {
        tileUrl: esriTileUrl('Reference/World_Boundaries_and_Places'),
        maxLevel: satelliteTileMaxLevel
    });
    imagery.visible = false;
    labels.visible = false;
    world.scene().add(imagery, labels);

    // Die Kachel-Bibliothek lässt gröbere Zoomstufen im Hintergrund liegen. Bei deckenden Fotos
    // fällt das nicht auf, bei transparenter Beschriftung stünde jeder Name doppelt da - deshalb
    // nur die aktuelle Stufe zeigen. Die Stufe ergibt sich aus der Kachelbreite.
    const tileLevel = (tile: THREE.Mesh) =>
        Math.round(Math.log2((Math.PI * 2) / (tile.geometry as THREE.SphereGeometry).parameters.phiLength));
    const showCurrentLabelLevel = () => {
        labels.children.forEach(child => {
            if (child.userData.labelTile) child.visible = tileLevel(child as THREE.Mesh) === labels.level;
        });
    };

    // Beschriftung sind transparente PNGs - unbeleuchtet, damit sie auch nachts lesbar bleibt
    let labelOpacity = 0;
    labels.addEventListener('childadded', ({ child }) => {
        const tile = child as THREE.Mesh;
        const previous = tile.material as THREE.MeshLambertMaterial;
        if (!previous.map) return; // innere Rückseite der Ebene, keine Kachel
        tile.material = new THREE.MeshBasicMaterial({
            map: previous.map,
            transparent: true,
            opacity: labelOpacity,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        previous.dispose();
        tile.userData.labelTile = true;
        tile.visible = tileLevel(tile) === labels.level;
    });

    let tilesLoaded = false;
    const lastCameraMatrix = new THREE.Matrix4();

    const step = () => {
        if (!isRunning()) return;

        const altitude = camera.position.length() / radius - 1;

        const load = tilesLoaded ? altitude < tilesUnloadAboveAltitude : altitude < tilesLoadBelowAltitude;
        if (load !== tilesLoaded) {
            tilesLoaded = load;
            imagery.visible = load;
            labels.visible = load;
            lastCameraMatrix.identity(); // beim nächsten Frame sicher nach Kacheln fragen
        }
        // Nur nach neuen Kacheln fragen, wenn sich die Kamera bewegt hat
        if (tilesLoaded && !lastCameraMatrix.equals(camera.matrixWorld)) {
            lastCameraMatrix.copy(camera.matrixWorld);
            imagery.updatePov(camera);
            labels.updatePov(camera);
            showCurrentLabelLevel();
        }

        const blend = tilesLoaded
            ? 1 - THREE.MathUtils.smoothstep(altitude, blendEndAltitude, blendStartAltitude)
            : 0;

        if (Math.abs(labelOpacity - blend) > 0.005) {
            labelOpacity = blend;
            labels.children.forEach(child => {
                const tileMaterial = (child as THREE.Mesh).material as THREE.Material;
                if (tileMaterial?.transparent) tileMaterial.opacity = blend;
            });
        }

        // Dunst ist mitten im Übergang am dichtesten; gerundet, damit die Seite nicht jedes
        // Frame neu rendert
        const haze = Math.round(hazeStrength * Math.sin(Math.PI * blend) * 100) / 100;

        onFrame({ altitude, blend, tilesLoaded, haze });

        requestAnimationFrame(step);
    };
    step();
};
