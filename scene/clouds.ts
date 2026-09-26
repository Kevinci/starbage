import * as THREE from 'three';
import type { SceneContext } from './context';

const cloudsAltitude = 0.004;
const cloudsRotationSpeed = -0.006; // Grad pro Frame

export const createClouds = ({ world, asset, isRunning }: SceneContext) => {
    let clouds: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial> | null = null;
    let fade = 0;

    // Beim Übergang zur Satellitenkarte lösen sich die Wolken auf (0 = voll, 1 = weg)
    const applyFade = () => {
        if (!clouds) return;
        clouds.material.opacity = 1 - fade;
        clouds.visible = fade < 1;
    };

    new THREE.TextureLoader().load(asset('clouds.png'), cloudsTexture => {
        clouds = new THREE.Mesh(
            new THREE.SphereGeometry(world.getGlobeRadius() * (1 + cloudsAltitude), 75, 75),
            new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
        );
        world.scene().add(clouds);
        applyFade();

        const rotate = () => {
            if (!isRunning() || !clouds) return;
            clouds.rotation.y += cloudsRotationSpeed * Math.PI / 180;
            requestAnimationFrame(rotate);
        };
        rotate();
    });

    const setFade = (value: number) => {
        fade = value;
        applyFade();
    };

    return { setFade };
};
