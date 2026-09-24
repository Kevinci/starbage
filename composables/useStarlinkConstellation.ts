import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GlobeInstance } from 'globe.gl';
import { createSurface, fillAll, gray, rand, type Layers } from './collectorTextures';

/**
 * Starlink-Konstellation (simuliert). Aufgebaut wie die echte: mehrere Schalen
 * mit fester Bahnneigung, darin gleichmäßig verteilte Bahnebenen und pro Ebene
 * gleich viele Satelliten, von Ebene zu Ebene versetzt (Walker-Konstellation).
 * Die Zahlen sind verkleinert, die Bahnen erfunden - keine echten Positionen.
 *
 * Rund tausend Satelliten als einzelne Meshes wären zu teuer, deshalb teilen
 * sich alle Satelliten drei InstancedMeshes (Rumpf, Solarflügel, Beschläge).
 */

interface StarlinkOptions {
    world: GlobeInstance;
    earthRadiusKm: number;
    visible: boolean;
    isRunning: () => boolean;
}

interface Shell {
    altitudeKm: number;
    inclinationDeg: number;
    planes: number;
    perPlane: number;
    phasing: number; // Walker-Versatz zwischen benachbarten Ebenen
}

// Angelehnt an die Gen1-Schalen: 53° als Hauptschale, dazu 70° und sonnensynchron polar.
// Der Walker-Versatz ist so gewählt, dass sich Satelliten dort, wo die Bahnebenen
// zusammenlaufen, möglichst selten treffen (per Skript gegen die Abstände optimiert).
const shells: Shell[] = [
    { altitudeKm: 550, inclinationDeg: 53, planes: 36, perPlane: 18, phasing: 25 },
    { altitudeKm: 570, inclinationDeg: 70, planes: 12, perPlane: 16, phasing: 3 },
    { altitudeKm: 560, inclinationDeg: 97.6, planes: 8, perPlane: 14, phasing: 2 }
];

// Bahnebenen einer Schale liegen leicht gestaffelt übereinander, damit sich
// Satelliten an den Kreuzungen nicht durchdringen
const planeAltitudeStep = 0.6;

const altitudeExaggeration = 3; // sonst kleben die Satelliten am Globus
const baseAngularSpeed = 0.05; // rad/s für die 550-km-Schale

// Satellitenkoordinaten: +X Flugrichtung, +Y zur Erde, Z quer zur Bahn.
// Flacher Rumpf mit den Antennen zur Erde, ein langer Solarflügel zur Seite.
const chassisSize = new THREE.Vector3(1.5, 0.12, 0.75);
const arraySize = new THREE.Vector3(1.05, 0.025, 4.2);

// Aluminium-Rumpf mit schwarzen Phased-Array-Antennen und kleinen Anbauteilen
const paintChassis = (layers: Layers, size: number) => {
    const { color, bump, rough } = layers;
    fillAll(layers, size, '#c3c8cf', 150, 90);

    for (let i = 0; i < 900; i++) {
        const y = rand(0, size);
        color.fillStyle = Math.random() < 0.5 ? gray(255, rand(0.03, 0.08)) : gray(0, rand(0.02, 0.06));
        color.fillRect(0, y, size, rand(0.5, 1.2));
    }

    // Antennenfelder: u entlang der Flugrichtung, v quer dazu
    const antennas = [
        [0.04, 0.06, 0.22, 0.4], [0.04, 0.52, 0.22, 0.4],
        [0.3, 0.06, 0.22, 0.4], [0.3, 0.52, 0.22, 0.4],
        [0.7, 0.3, 0.26, 0.55]
    ];
    antennas.forEach(([u, v, width, height]) => {
        const x = u * size;
        const y = v * size;
        const w = width * size;
        const h = height * size;
        color.fillStyle = '#0b0d11';
        color.beginPath();
        color.roundRect(x, y, w, h, size * 0.015);
        color.fill();
        bump.fillStyle = gray(90);
        bump.fillRect(x, y, w, h);
        rough.fillStyle = gray(170);
        rough.fillRect(x, y, w, h);
    });

    // Kleinteile: Sensoren, Stecker, Bohrungen
    for (let i = 0; i < 40; i++) {
        const x = rand(0.54, 0.68) * size;
        const y = rand(0.05, 0.95) * size;
        color.fillStyle = '#15181d';
        color.fillRect(x, y, rand(4, 14), rand(4, 18));
    }
    for (let i = 0; i < 30; i++) {
        color.fillStyle = gray(40);
        color.beginPath();
        color.arc(rand(0, size), rand(0, size), rand(1, 2.5), 0, Math.PI * 2);
        color.fill();
    }

    color.strokeStyle = gray(90, 0.8);
    color.lineWidth = 6;
    color.strokeRect(0, 0, size, size);
};

// Solarflügel: dunkelblaue Zellen mit weißen Trennstreifen quer zum Flügel
const paintArray = (layers: Layers, size: number) => {
    const { color, rough } = layers;
    fillAll(layers, size, '#1f2b6b', 128, 70);

    const cells = 16;
    const cell = size / cells;
    for (let row = 0; row < cells; row++) {
        for (let column = 0; column < cells; column++) {
            color.fillStyle = `hsl(${rand(228, 238)}, ${rand(45, 60)}%, ${rand(24, 32)}%)`;
            color.fillRect(column * cell + 1, row * cell + 1, cell - 2, cell - 2);
        }
    }
    for (let y = 0; y < size; y += cell * 4) {
        color.fillStyle = '#e5e7eb';
        color.fillRect(0, y, size, 5);
        rough.fillStyle = gray(160);
        rough.fillRect(0, y, size, 5);
    }
};

const buildGeometries = () => {
    const chassis = new THREE.BoxGeometry(chassisSize.x, chassisSize.y, chassisSize.z);

    // Flügel sitzt an der Längskante und geht quer zur Bahn weg
    const array = new THREE.BoxGeometry(arraySize.x, arraySize.y, arraySize.z);
    array.translate(-0.1, -0.03, chassisSize.z / 2 + 0.12 + arraySize.z / 2);
    const mast = new THREE.BoxGeometry(0.12, 0.05, 0.24);
    mast.translate(-0.1, -0.03, chassisSize.z / 2 + 0.06);
    const arrayWithMast = mergeGeometries([array.toNonIndexed(), mast.toNonIndexed()]);

    // Messing-Beschläge an den Kanten, wie Halterungen für den Start-Stapel
    const fitting = (x: number, z: number, alongX: boolean) => {
        const geometry = new THREE.CylinderGeometry(0.09, 0.09, 0.16, 10);
        geometry.rotateZ(alongX ? Math.PI / 2 : 0);
        if (!alongX) geometry.rotateX(Math.PI / 2);
        geometry.translate(x, -0.02, z);
        return geometry;
    };
    const fittings = mergeGeometries([
        fitting(-chassisSize.x / 2 + 0.12, -chassisSize.z / 2 - 0.06, false),
        fitting(0.25, -chassisSize.z / 2 - 0.06, false),
        fitting(chassisSize.x / 2 + 0.06, chassisSize.z / 2 - 0.15, true)
    ]);

    return { chassis, array: arrayWithMast, fittings };
};

export const useStarlinkConstellation = () => {
    let meshes: THREE.InstancedMesh[] = [];
    let isVisible = false;

    const setVisible = (visible: boolean) => {
        isVisible = visible;
        meshes.forEach(mesh => { mesh.visible = visible; });
    };

    const start = ({ world, earthRadiusKm, visible, isRunning }: StarlinkOptions) => {
        const globeRadius = world.getGlobeRadius();

        const chassisSurface = createSurface(512, paintChassis);
        const arraySurface = createSurface(512, paintArray);
        arraySurface.map.repeat.set(1, 3);
        arraySurface.roughnessMap.repeat.set(1, 3);

        const materials = {
            chassis: new THREE.MeshStandardMaterial({
                ...chassisSurface, roughness: 1, metalness: 0.6, bumpScale: 1,
                emissiveMap: chassisSurface.map, emissive: '#ffffff', emissiveIntensity: 0.12
            }),
            // Dunkle Zellen gingen im Schatten ganz unter - etwas Eigenleuchten
            array: new THREE.MeshStandardMaterial({
                map: arraySurface.map, roughnessMap: arraySurface.roughnessMap, roughness: 1, metalness: 0.2,
                emissiveMap: arraySurface.map, emissive: '#ffffff', emissiveIntensity: 0.4
            }),
            fittings: new THREE.MeshStandardMaterial({
                color: '#c9a227', metalness: 0.85, roughness: 0.35, emissive: '#5a4300', emissiveIntensity: 0.4
            })
        };

        // Jede Bahnebene: erst in die Äquatorebene legen (Globus-Pol ist +Y),
        // dann um die Knotenlinie neigen, dann um den Pol auf ihre Länge drehen
        interface Satellite { plane: THREE.Matrix4; base: THREE.Matrix4; phase: number; speed: number }
        const satellites: Satellite[] = [];

        const orbitRadius = (altitudeKm: number) =>
            globeRadius * (1 + (altitudeKm / earthRadiusKm) * altitudeExaggeration);
        const referenceRadius = orbitRadius(550);

        shells.forEach(shell => {
            const shellRadius = orbitRadius(shell.altitudeKm);
            // Höhere Bahnen laufen langsamer (drittes Keplersches Gesetz)
            const speed = baseAngularSpeed * Math.pow(referenceRadius / shellRadius, 1.5);
            const tilt = new THREE.Matrix4().makeRotationX(Math.PI / 2 + THREE.MathUtils.degToRad(shell.inclinationDeg));

            for (let p = 0; p < shell.planes; p++) {
                const radius = shellRadius + (((p * 7) % 5) - 2) * planeAltitudeStep;
                const base = new THREE.Matrix4()
                    .makeTranslation(radius, 0, 0)
                    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)); // Nase in Flugrichtung
                const raan = (p / shell.planes) * Math.PI * 2;
                const plane = new THREE.Matrix4().makeRotationY(raan).multiply(tilt);

                for (let s = 0; s < shell.perPlane; s++) {
                    const phase = (s / shell.perPlane) * Math.PI * 2
                        + (p * shell.phasing / (shell.planes * shell.perPlane)) * Math.PI * 2;
                    satellites.push({ plane, base, phase, speed });
                }
            }
        });

        const geometries = buildGeometries();
        meshes = (['chassis', 'array', 'fittings'] as const).map(part => {
            const mesh = new THREE.InstancedMesh(geometries[part], materials[part], satellites.length);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            // Die Bounding-Sphere läge sonst nur um den Ursprung - Satelliten würden weggeschnitten
            mesh.frustumCulled = false;
            world.scene().add(mesh);
            return mesh;
        });
        setVisible(visible);

        const clock = new THREE.Clock();
        const orbitMatrix = new THREE.Matrix4();
        const matrix = new THREE.Matrix4();
        let elapsed = 0;

        const step = () => {
            if (!isRunning()) return;

            elapsed += Math.min(clock.getDelta(), 0.05);

            // Ausgeblendet laufen die Bahnen weiter, nur die Matrizen spart man sich
            if (!isVisible) {
                requestAnimationFrame(step);
                return;
            }

            satellites.forEach((satellite, index) => {
                orbitMatrix.makeRotationZ(satellite.phase + satellite.speed * elapsed).multiply(satellite.base);
                matrix.multiplyMatrices(satellite.plane, orbitMatrix);
                meshes.forEach(mesh => mesh.setMatrixAt(index, matrix));
            });
            meshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });

            requestAnimationFrame(step);
        };
        step();
    };

    return { start, setVisible };
};
