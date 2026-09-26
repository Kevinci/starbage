import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { SceneContext } from './context';

// Das ISS-Modell nutzt PBR-Materialien: ohne Environment-Map bleiben Metallflaechen schwarz.
export const setupEnvironment = ({ world }: SceneContext) => {
    const scene = world.scene();
    const pmremGenerator = new THREE.PMREMGenerator(world.renderer());

    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;

    pmremGenerator.dispose();
};
