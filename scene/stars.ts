import * as THREE from 'three';
import type { SceneContext } from './context';

export const addStars = ({ world }: SceneContext) => {
    const starCount = 3500; // Anzahl der Sterne
    const distance = 25003; // Entfernung der Sterne von der Kamera

    const starsGeometry = new THREE.BufferGeometry();

    const positions = [];
    const colors = [];

    // Generiere zufällige Sterne
    for (let i = 0; i < starCount; i++) {
        // Zufällige Position auf einer Kugeloberfläche
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI * 2;

        const x = distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.sin(phi) * Math.sin(theta);
        const z = distance * Math.cos(phi);

        positions.push(x, y, z);

        // Wechsle ab zwischen Grau und Weiß
        const color = new THREE.Color();
        if (i % 2 === 0) {
            color.setRGB(1, 1, 1); // Weiß
        } else {
            color.setRGB(0.5, 0.5, 0.5); // Grau
        }

        // Bestimmte Sterne rot oder blau machen
        if (i % 10 === 0) {
            color.setRGB(89, 0, 0); // Rot
        } else if (i % 15 === 0) {
            color.setRGB(0, 0, 50); // Blau
        }

        colors.push(color.r, color.g, color.b);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({ size: 50, vertexColors: true });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    world.scene().add(stars);
};
