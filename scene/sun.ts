import * as THREE from 'three';
import type { SceneContext } from './context';
import type { SubsolarPoint } from './sunPosition';

/**
 * Sonne in der echten subsolaren Richtung, also genau über der Tagseite. Liefert
 * gleichzeitig das Licht für ISS, Mond, Satelliten und Abfangschiff.
 */

// Die echte Entfernung wären rund 23.500 Erdradien - so weit weg würde sie nur dann ins
// Bild passen, wenn sie fast genau hinter der Erde steht und damit verdeckt ist. Deshalb
// bewusst nah und groß, dafür sichtbar, sobald man zur Tagseite dreht. Richtung bleibt
// exakt, nur Abstand und Größe sind gesetzt.
const sunDistance = 12000; // innerhalb der Sternkugel (25.003)
const sunRadius = 700; // ergibt rund 6,7 Grad Sehwinkel vom Globus aus
// Die Kamera zielt immer auf den Erdmittelpunkt und hat rund 50 Grad Blickfeld.
// Die Sonnenscheibe ist deshalb nur sichtbar, wenn ihre Richtung zwischen der
// Erdkante und dem Bildrand liegt. Ein weiter, additiver Halo macht sie darüber
// hinaus als Glare erkennbar, auch wenn die Scheibe selbst noch außerhalb liegt.
const sunGlowScale = 18;

// Weicher Halo als Sprite: dreht sich immer zur Kamera und braucht keine Datei
const createSunGlowTexture = () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0.00, 'rgba(255, 252, 240, 1.00)');
    gradient.addColorStop(0.06, 'rgba(255, 244, 205, 0.85)');
    gradient.addColorStop(0.16, 'rgba(255, 226, 160, 0.42)');
    gradient.addColorStop(0.34, 'rgba(255, 200, 120, 0.17)');
    gradient.addColorStop(0.60, 'rgba(255, 178, 95, 0.06)');
    gradient.addColorStop(1.00, 'rgba(255, 165, 80, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
};

export const createSun = ({ world }: SceneContext) => {
    const sunGroup = new THREE.Group();

    // Scheibe: leuchtet selbst, braucht deshalb kein Licht
    const disc = new THREE.Mesh(
        new THREE.SphereGeometry(sunRadius, 32, 32),
        new THREE.MeshBasicMaterial({ color: '#fff6e0' })
    );
    sunGroup.add(disc);

    const glowTexture = createSunGlowTexture();
    if (glowTexture) {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTexture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true
        }));
        glow.scale.setScalar(sunRadius * sunGlowScale);
        sunGroup.add(glow);
    }

    world.scene().add(sunGroup);

    // Licht aus derselben Richtung, damit die Objekte zur Tagseite passen.
    // Die Grundhelligkeit bleibt hoch genug, dass die Nachtseite nicht schwarz wird.
    const sunLight = new THREE.DirectionalLight(0xfff4e0, Math.PI * 0.9);
    world.lights([new THREE.AmbientLight(0xccd6e8, Math.PI * 0.6), sunLight]);

    const update = ({ lat, lng }: SubsolarPoint) => {
        // getCoords liefert die Weltposition zu lat/lng - dieselbe Konvention wie die
        // Textur, damit Sonnenscheibe und Terminator im Shader zusammenpassen.
        const surface = world.getCoords(THREE.MathUtils.radToDeg(lat), THREE.MathUtils.radToDeg(lng), 0);
        const position = new THREE.Vector3(surface.x, surface.y, surface.z).normalize().multiplyScalar(sunDistance);

        sunGroup.position.copy(position);
        sunLight.position.copy(position);
    };

    return { update };
};
