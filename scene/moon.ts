import * as THREE from 'three';
import type { SceneContext } from './context';

export const addMoon = ({ world, asset, isRunning }: SceneContext) => {
    // Position des Mondes und der Erde
    const moonDistance = 40000; // Durchschnittliche Entfernung zwischen Erde und Mond in km
    const moonRadius = 1737.4; // Radius des Mondes in km

    // Zeitvariablen für die Orbitbewegung des Mondes
    let time = 0;
    const orbitPeriodSeconds = 2360590; // Umlaufzeit des Mondes um die Erde in Sekunden
    const framesPerSecond = 60; // Frames pro Sekunde

    const orbitSpeed = (2 * Math.PI) / (orbitPeriodSeconds * framesPerSecond); // Geschwindigkeit, mit der sich der Mond um die Erde bewegt (experimentell anpassen)

    const moonTexture = new THREE.TextureLoader().load(asset('moon.jpg'));
    const moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(moonRadius, 32, 32),
        new THREE.MeshPhongMaterial({ map: moonTexture })
    );
    world.scene().add(moonMesh);

    // Zusätzliches weiches Licht für die ganze Szene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    world.scene().add(ambientLight);

    // Position des Mondes in jedem Frame weiterrücken
    const animate = () => {
        if (!isRunning()) return;
        const angle = time * orbitSpeed;
        moonMesh.position.set(Math.cos(angle) * moonDistance, 0, Math.sin(angle) * moonDistance);
        time += 1;
        requestAnimationFrame(animate);
    };
    animate();
};
