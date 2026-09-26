import * as THREE from 'three';
import type { SceneContext } from './context';
import type { SpaceDebris } from '../types/spaceDebris';

/**
 * Simulierte Trümmerwolke: rote Punkte in drei Höhenbändern (800-1000 km, 1400 km, GEO),
 * nahe am Äquator. Erfundene Koordinaten, steht nur symbolisch für die echte Lage.
 */

const debrisCount = 2000;

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const generateSpaceDebrisData = (count: number): SpaceDebris[] => {
    const debrisData: SpaceDebris[] = [];
    for (let i = 0; i < count; i++) {
        const debrisId = 50000 + i;
        // Abwechselnd zwischen 800-1000 km, 1400 km und GEO
        const altitude = i % 3 === 0 ? randomBetween(800, 1000) : (i % 3 === 1 ? 1400 : randomBetween(20000, 36000));
        debrisData.push({
            id: debrisId,
            name: `Debris-${debrisId}`,
            inclination: randomBetween(0, 10), // Inklination nahe dem Äquator, zwischen 0 und 10 Grad
            longitude: randomBetween(0, 360), // Zufällige Längengrade
            perigeeArg: randomBetween(0, 360), // Zufälliges Argument des Perigäums
            meanAnomaly: randomBetween(0, 360), // Zufällige mittlere Anomalie
            altitude, // Höhe in km
            orbitalPeriod: randomBetween(11.5, 15.0) // Zufällige Umlaufzeit zwischen 11.5 und 15 Stunden
        });
    }
    return debrisData;
};

export const addDebrisCloud = ({ world }: SceneContext) => {
    const earthRadius = world.getGlobeRadius();

    generateSpaceDebrisData(debrisCount).forEach(({ inclination, longitude, altitude }) => {
        const markerMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 0.2, 0.2),
            new THREE.MeshLambertMaterial({ color: 'red' })
        );

        // Breite und Länge in Kugelkoordinaten, Höhe wie überall überzeichnet
        const phi = THREE.MathUtils.degToRad(90 - inclination);
        const theta = THREE.MathUtils.degToRad(longitude);
        markerMesh.position.setFromSphericalCoords(earthRadius + altitude / 10, phi, theta);

        world.scene().add(markerMesh);
    });
};
