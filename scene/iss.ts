import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SceneContext } from './context';

/**
 * ISS in Echtzeit: Position alle 3,5 s von wheretheiss.at, dazwischen interpoliert.
 * Dazu die Kamera, die der ISS folgt.
 *
 * issPivot trägt Position + Bahnausrichtung, das glTF hängt in einem eigenen Holder
 * darin - so kollidiert die Achsenkorrektur des Modells nicht mit der Lage.
 */

const issTargetSize = 24; // größte Kantenlänge des Modells in Globus-Einheiten (Radius = 100)
const issSmoothing = 0.05; // Lerp-Faktor pro Frame für die ISS-Bewegung
const issViewAltitude = 0.9; // Kamerahöhe in Globus-Radien, bei der die ISS das Bild füllt
const issUpdateIntervalMs = 3500;
export const followTransitionMs = 1400; // Dauer des Kameraflugs zur ISS und zurück

interface IssOptions {
    isFollowing: () => boolean;
}

export const createIss = ({ world, asset, isRunning }: SceneContext, { isFollowing }: IssOptions) => {
    const issPivot = new THREE.Object3D();
    issPivot.name = 'issGroup';
    issPivot.visible = false; // erst zeigen, wenn eine Position bekannt ist

    // Platzhalter, solange das große glTF-Modell noch lädt
    let placeholder: THREE.Mesh | null = new THREE.Mesh(
        new THREE.OctahedronGeometry(issTargetSize / 5, 1),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.5, roughness: 0.4 })
    );
    issPivot.add(placeholder);
    world.scene().add(issPivot);

    let hasFix = false;
    const targetPosition = new THREE.Vector3();
    const targetQuaternion = new THREE.Quaternion();
    const previousPosition = new THREE.Vector3();

    new GLTFLoader().load(
        asset('ISS_stationary.glb'),
        gltf => {
            const model = gltf.scene;

            // Auf eine im Globus-Maßstab sichtbare Größe normieren ...
            const bounds = new THREE.Box3().setFromObject(model);
            const size = bounds.getSize(new THREE.Vector3());
            const longestEdge = Math.max(size.x, size.y, size.z) || 1;
            model.scale.setScalar(issTargetSize / longestEdge);

            // ... und um den eigenen Mittelpunkt zentrieren
            bounds.setFromObject(model);
            model.position.sub(bounds.getCenter(new THREE.Vector3()));

            // Die längste Achse ist der Gitterträger mit den Solarpanelen. Der liegt
            // beim Original quer zur Flugrichtung, also auf die X-Achse des Pivots drehen.
            const holder = new THREE.Object3D();
            holder.add(model);
            const longestAxis = [size.x, size.y, size.z].indexOf(longestEdge);
            if (longestAxis === 1) holder.rotation.z = Math.PI / 2; // Y -> X
            if (longestAxis === 2) holder.rotation.y = Math.PI / 2; // Z -> X

            if (placeholder) {
                issPivot.remove(placeholder);
                placeholder.geometry.dispose();
                (placeholder.material as THREE.Material).dispose();
                placeholder = null;
            }
            issPivot.add(holder);
        },
        undefined,
        error => console.error('ISS-Modell konnte nicht geladen werden:', error)
    );

    // Erdzugewandte Lage: +Y des Pivots zeigt nach außen, +Z in Flugrichtung.
    const setTarget = (position: THREE.Vector3) => {
        const up = position.clone().normalize();
        const forward = new THREE.Vector3();

        if (previousPosition.lengthSq() > 0) {
            forward.copy(position).sub(previousPosition);
            forward.sub(up.clone().multiplyScalar(forward.dot(up))); // Radialanteil raus -> Tangente
        }
        if (forward.lengthSq() < 1e-8) {
            // Beim ersten Fix fehlt die Bewegungsrichtung - irgendeine gültige Tangente nehmen,
            // damit die Basis nicht entartet.
            forward.set(0, 1, 0).sub(up.clone().multiplyScalar(up.y));
            if (forward.lengthSq() < 1e-8) forward.set(1, 0, 0);
        }
        forward.normalize();

        const side = new THREE.Vector3().crossVectors(up, forward).normalize();

        targetQuaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, forward));
        targetPosition.copy(position);
        previousPosition.copy(position);
    };

    const fetchPosition = () => {
        fetch('https://api.wheretheiss.at/v1/satellites/25544')
            .then(response => response.json())
            .then(data => {
                const { latitude, longitude, altitude } = data;

                // Überhöht dargestellt, sonst klebt die ISS am Globus
                const altitudeRatio = (altitude / 10) / world.getGlobeRadius();
                const { x, y, z } = world.getCoords(latitude, longitude, altitudeRatio);

                setTarget(new THREE.Vector3(x, y, z));

                if (!hasFix) {
                    issPivot.position.copy(targetPosition);
                    issPivot.quaternion.copy(targetQuaternion);
                    issPivot.visible = true;
                    hasFix = true;
                }
            })
            .catch(error => {
                console.error('Error fetching ISS position:', error);
            });
    };

    // Kamera auf die ISS ausrichten. Ohne altitude bleibt der aktuelle Zoom erhalten,
    // damit im Verfolgungsmodus weiter gezoomt werden kann.
    const focus = (transitionMs = 0, altitude?: number) => {
        if (!hasFix) return;

        const { lat, lng } = world.toGeoCoords(issPivot.position);
        world.pointOfView({ lat, lng, altitude: altitude ?? world.pointOfView().altitude }, transitionMs);
    };

    // Der Kameraflug braucht eine bekannte ISS-Position. Wird der Modus vor dem ersten
    // Fix aktiviert, startet der Flug nach, sobald die Position da ist.
    let followFlightPending = false;
    let followFlightUntil = 0;

    const startFollowFlight = () => {
        if (!followFlightPending || !hasFix) return;

        followFlightPending = false;
        followFlightUntil = performance.now() + followTransitionMs;
        focus(followTransitionMs, issViewAltitude);
    };

    // Ohne returnToGlobe bleibt die Kamera stehen, z. B. weil gleich das Schiff übernimmt
    const setFollow = (following: boolean, returnToGlobe = true) => {
        followFlightPending = following;
        if (following) startFollowFlight();
        else if (returnToGlobe) world.pointOfView({ altitude: 2.5 }, followTransitionMs);
    };

    // Die API liefert nur alle 3,5 s - dazwischen wird interpoliert, damit die ISS gleitet.
    const step = () => {
        if (!isRunning()) return;

        if (hasFix) {
            issPivot.position.lerp(targetPosition, issSmoothing);
            issPivot.quaternion.slerp(targetQuaternion, issSmoothing);

            startFollowFlight();
            // Während des Kamerafluges nicht dazwischenfunken, danach mitziehen
            if (isFollowing() && performance.now() > followFlightUntil) focus();
        }
        requestAnimationFrame(step);
    };

    fetchPosition();
    const interval = setInterval(fetchPosition, issUpdateIntervalMs);
    step();

    const stop = () => clearInterval(interval);

    return { setFollow, stop };
};
