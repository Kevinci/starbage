import * as THREE from 'three';
import type { SceneContext } from './context';

/**
 * Standort des Nutzers: Kamera startet über dem eigenen Standort, dort steht ein
 * oranger Kegel. Ohne Freigabe der Ortung bleibt beides aus.
 */

export const createUserLocation = ({ world }: SceneContext) => {
    let marker: THREE.Mesh | null = null;
    let markerVisible = true;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                world.pointOfView({ lat: latitude, lng: longitude, altitude: 2.5 });

                marker = new THREE.Mesh(
                    new THREE.ConeGeometry(1.65, 10, 15),
                    new THREE.MeshPhongMaterial({ color: '#E47F00' })
                );
                const phi = THREE.MathUtils.degToRad(90 - latitude);
                const theta = THREE.MathUtils.degToRad(longitude);
                marker.position.setFromSphericalCoords(world.getGlobeRadius() + 4.5, phi, theta);
                marker.rotateX(THREE.MathUtils.degToRad(230));
                marker.visible = markerVisible;
                world.scene().add(marker);
            },
            error => {
                console.error('Error getting user location:', error);
            }
        );
    } else {
        console.error('Geolocation is not supported by this browser.');
    }

    // Der Kegel ist rund 290 km hoch - über der Satellitenkarte wird er ausgeblendet
    const setMarkerVisible = (visible: boolean) => {
        markerVisible = visible;
        if (marker) marker.visible = visible;
    };

    return { setMarkerVisible };
};
