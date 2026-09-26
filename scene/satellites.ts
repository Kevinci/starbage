import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { EARTH_RADIUS_KM, type SceneContext } from './context';
import type { SatelliteData } from '../types/satteliteData';

/**
 * Echte Satelliten aus dem TLE-Datensatz in public/data.txt, propagiert mit satellite.js.
 * Nutzt den Objekt-Layer von globe.gl, der in scene/globe.ts eingerichtet ist.
 */

const satelliteSizeKm = 100;
const maxSatellites = 2000;

export const createSatellites = ({ world, asset }: SceneContext, visible: boolean) => {
    let satData: SatelliteData[] = [];

    const geometry = new THREE.OctahedronGeometry(satelliteSizeKm * world.getGlobeRadius() / EARTH_RADIUS_KM / 2, 0);
    const material = new THREE.MeshLambertMaterial({ color: '#7f007d', transparent: true, opacity: 0.7 });
    material.visible = visible;
    world.objectThreeObject(() => new THREE.Mesh(geometry, material));

    const update = () => {
        const now = new Date();
        const gmst = satellite.gstime(now);
        satData.forEach(d => {
            const eci = satellite.propagate(d.satrec, now);
            if (eci.position && typeof eci.position !== 'boolean') {
                const gdPos = satellite.eciToGeodetic(eci.position, gmst);

                d.lat = satellite.degreesLat(gdPos.latitude);
                d.lng = satellite.degreesLong(gdPos.longitude);
                d.alt = gdPos.height / EARTH_RADIUS_KM;
            }
        });
        world.objectsData(satData);
    };

    fetch(asset('data.txt'))
        .then(response => response.text())
        .then(rawData => {
            const tleData = rawData.replace(/\r/g, '').split(/\n(?=[^12])/).filter(d => d).map(tle => tle.split('\n'));
            satData = tleData
                .map(([name, ...tle]) => ({
                    satrec: satellite.twoline2satrec(tle[0], tle[1]),
                    name: name.trim().replace(/^0 /, '')
                }))
                .filter(d => !!satellite.propagate(d.satrec, new Date()).position)
                .slice(0, maxSatellites) as SatelliteData[];
            update();
        });

    const setVisible = (value: boolean) => {
        material.visible = value;
    };

    return { update, setVisible };
};
