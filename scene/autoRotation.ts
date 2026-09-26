import type { SceneContext } from './context';

/**
 * Auto-Rotation der Erde: aus der Ferne mit voller Geschwindigkeit, beim Heranzoomen immer
 * langsamer, über der Satellitenkarte gar nicht. Solange eine Kamera ISS oder Schiff folgt,
 * bleibt sie aus. Nirgends sonst controls.autoRotate setzen.
 */

const autoRotateSpeed = 0.15;
const autoRotateFullAltitude = 2.5; // darüber volle Drehgeschwindigkeit, darunter langsamer

interface AutoRotationOptions {
    isCameraFree: () => boolean;
}

export const createAutoRotation = ({ world }: SceneContext, { isCameraFree }: AutoRotationOptions) => {
    const controls = world.controls();

    // altitude in Globus-Radien, mapBlend 0 = eigene Erde, 1 = nur noch Satellitenkarte
    const update = (altitude: number, mapBlend: number) => {
        controls.autoRotate = isCameraFree() && mapBlend < 1;
        controls.autoRotateSpeed = autoRotateSpeed * Math.min(1, altitude / autoRotateFullAltitude) * (1 - mapBlend);
    };

    return { update };
};
