import * as THREE from 'three';
import type { GlobeInstance } from 'globe.gl';
import { createCollectorSurfaces, withRepeat, type CollectorSurfaces, type Surface } from './collectorTextures';

/**
 * Abfangschiff für Weltraumschrott (simuliert). Fliegt auf einer erfundenen,
 * geneigten Bahn, auf der Trümmerteile treiben. Kommt das Schiff einem Teil nahe,
 * wird es ins Fangnetz gezogen und gezählt. Später taucht an anderer Stelle der
 * Bahn neuer Schrott auf, damit die Bahn nie leer wird.
 *
 * Im Spielmodus lenkt der Nutzer das Schiff innerhalb eines Korridors um die
 * Bahn (links/rechts, hoch/runter), der Schrott ist über diesen Korridor verteilt.
 */

interface CollectorShipOptions {
    world: GlobeInstance;
    earthRadiusKm: number;
    solarTextureUrl: string;
    logoUrl: string;
    isRunning: () => boolean;
}

type DebrisPhase = 'drifting' | 'capturing' | 'gone' | 'spawning' | 'parked';

interface DebrisPiece {
    object: THREE.Object3D;
    materials: THREE.MeshStandardMaterial[];
    angle: number; // Lage auf der Bahn in Radiant
    angularSpeed: number; // eigene Drift entlang der Bahn, rad/s
    radialOffset: number;
    lateralOffset: number;
    spin: THREE.Vector3;
    phase: DebrisPhase;
    timer: number;
    captureStart: THREE.Vector3;
    gameOnly: boolean; // nur im Spielmodus unterwegs, sonst geparkt und unsichtbar
}

const inclinationDeg = -28;
const raanDeg = 115;
const altitudeKm = 750;
const altitudeExaggeration = 3.4;
const shipOrbitSpeed = 0.1; // rad/s, eine Runde in gut einer Minute
const debrisCount = 40;
const gameDebrisCount = 50; // der Korridor ist breit - ohne Zusatzteile wäre er zu leer
const captureRadius = 5; // Abstand zur Netzöffnung, ab dem ein Teil eingefangen wird
const captureDuration = 0.9; // s
const respawnDelay = [4, 9]; // s
const spawnDuration = 1.2; // s

// Mitflug-Kamera in Schiffskoordinaten: schräg seitlich und oberhalb, -Y zeigt
// von der Erde weg - so liegt die Erde hinter dem Schiff im Bild
const followOffset = new THREE.Vector3(4, -20, 26);
const followLookAt = new THREE.Vector3(5, 0, 0);
const followFlightDuration = 1.8; // s
const followMinDistance = 12;
const followMaxDistance = 160;
const globeViewTransitionMs = 1400;

// Spielmodus: Korridor um die Bahn, in dem Schrott liegt und das Schiff lenkt.
// Quer zur Bahn ist Schiff-Z, radial ist Schiff-Y (+Y zur Erde).
const corridorHalfWidth = 14;
const corridorHalfHeight = 7;
const autoOffsetRange = 2; // ohne Spielmodus liegt der Schrott knapp um die Bahnlinie
const steerMaxSpeed = 16; // Einheiten/s
const steerResponse = 4; // wie schnell das Schiff auf die Tasten reagiert
const steerReturn = 1.5; // ohne Spielmodus gleitet das Schiff zurück zur Bahnmitte
const steerCaptureRadius = 4.2; // enger als im Automatikbetrieb - man muss wirklich treffen
const steerCameraLag = 3;
// Verfolgerkamera hinter und über dem Schiff, damit links/rechts auch auf dem Bildschirm stimmen
// Erhöht und leicht nach unten geneigt, damit die Erde unten im Bild liegt
const steerCameraOffset = new THREE.Vector3(-26, -16, 0);
const steerLookAt = new THREE.Vector3(12, 5, 0);
const shipUpLocal = new THREE.Vector3(0, -1, 0);

export type CollectorCameraMode = 'off' | 'follow' | 'steer';

// In Schiffskoordinaten: Nase zeigt in +X, die Netzöffnung liegt vorne
const netMouth = new THREE.Vector3(16.5, 0, 0);
const netInside = new THREE.Vector3(12, 0, 0);

const debrisTint = new THREE.Color('#ff3b30');
const captureTint = new THREE.Color('#67e8f9');

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

// Weicher Lichtpunkt für Positionslichter und Fangblitz
const createGlowTexture = () => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (context) {
        const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
    }

    return new THREE.CanvasTexture(canvas);
};

// Logo-Plakette: das weiße Logo braucht einen dunklen Grund, auf dem hellen
// Rumpf wäre es unsichtbar. Das Bild lädt nach, die Plakette ist sofort da.
const createLogoDecalTexture = (logoUrl: string) => {
    const width = 1024;
    const height = 400;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const radius = 48;
    context.beginPath();
    context.roundRect(8, 8, width - 16, height - 16, radius);
    context.fillStyle = '#16233b';
    context.fill();
    context.lineWidth = 12;
    context.strokeStyle = '#E47F00';
    context.stroke();

    const logo = new Image();
    logo.onload = () => {
        const padding = 90;
        const logoWidth = width - padding * 2;
        const logoHeight = logoWidth * (logo.height / logo.width);
        context.drawImage(logo, padding, (height - logoHeight) / 2, logoWidth, logoHeight);
        texture.needsUpdate = true;
    };
    logo.src = logoUrl;

    return texture;
};

const createGlow = (texture: THREE.Texture, color: THREE.ColorRepresentation, scale: number) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    sprite.scale.setScalar(scale);
    return sprite;
};

// Zylinder und Kegel stehen in three.js auf der Y-Achse - hier auf X legen (Oberseite nach +X)
const alongX = <T extends THREE.Object3D>(object: T, x: number): T => {
    object.rotation.z = -Math.PI / 2;
    object.position.x = x;
    return object;
};

// Stab zwischen zwei Punkten
const beam = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
    const direction = to.clone().sub(from);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
};

// Rauheit kommt aus der Textur, der Grundwert multipliziert nur noch
const surfaceMaterial = (surface: Surface, params: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ ...surface, roughness: 1, bumpScale: 1.2, ...params });

const buildShip = (
    surfaces: CollectorSurfaces,
    solarTexture: THREE.Texture,
    glowTexture: THREE.Texture,
    logoTexture: THREE.Texture
) => {
    const ship = new THREE.Group();

    const hullMaterial = surfaceMaterial(surfaces.hull, { metalness: 0.35 });
    // Kommandomodul ist kurz - Platten sonst gestaucht
    const noseMaterial = surfaceMaterial(withRepeat(surfaces.hull, 1, 0.45), { metalness: 0.35 });
    const darkMaterial = surfaceMaterial(surfaces.darkMetal, { metalness: 0.7 });
    const tankMaterial = surfaceMaterial(surfaces.tank, {
        metalness: 0.25, emissive: '#E47F00', emissiveIntensity: 0.1
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
        color: '#E47F00', emissive: '#E47F00', emissiveIntensity: 0.25, metalness: 0.4, roughness: 0.45
    });
    // Ohne Umgebung zum Spiegeln wirkt volles Metall schwarz - deshalb etwas Eigenleuchten
    const foilMaterial = surfaceMaterial(surfaces.foil, {
        metalness: 0.7, emissiveMap: surfaces.foil.map, emissive: '#ffffff', emissiveIntensity: 0.35, bumpScale: 2
    });
    const radiatorMaterial = surfaceMaterial(surfaces.radiator, { metalness: 0.2 });
    const solarMaterial = new THREE.MeshStandardMaterial({
        // Die helle Raumumgebung spiegelt sich sonst grau über die Zellen
        map: solarTexture, emissiveMap: solarTexture, emissive: '#ffffff', emissiveIntensity: 0.3,
        envMapIntensity: 0.2, metalness: 0, roughness: 0.7, side: THREE.DoubleSide
    });
    const windowMaterial = new THREE.MeshBasicMaterial({ color: '#67e8f9' });

    // Kommandomodul vorne mit Kuppel und leuchtendem Fensterband
    ship.add(alongX(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.7, 3, 20), noseMaterial), 7.5));
    ship.add(alongX(new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), noseMaterial
    ), 9));
    const windowBand = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.1, 6, 32), windowMaterial);
    windowBand.rotation.y = Math.PI / 2;
    windowBand.position.x = 7.8;
    ship.add(windowBand);
    ship.add(alongX(new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.5, 20), darkMaterial), 5.8));

    // Mittelteil: sechseckiger Rumpf mit Segmentringen
    ship.add(alongX(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 7, 6), hullMaterial), 2));
    [0, 2, 4].forEach(x => {
        ship.add(alongX(new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.56, 0.18, 6), darkMaterial), x));
    });

    // Vier Treibstofftanks rund um den Rumpf
    const tankGeometry = new THREE.CapsuleGeometry(0.55, 3.6, 4, 12);
    for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
        const tank = alongX(new THREE.Mesh(tankGeometry, tankMaterial), 1.8);
        tank.position.y = Math.cos(angle) * 2.2;
        tank.position.z = Math.sin(angle) * 2.2;
        ship.add(tank);
    }

    // Radiatoren als Finnen oben und unten
    const radiatorGeometry = new THREE.BoxGeometry(3.4, 3, 0.06);
    [-1, 1].forEach(side => {
        const radiator = new THREE.Mesh(radiatorGeometry, radiatorMaterial);
        radiator.position.set(-0.2, side * 3.1, 0);
        ship.add(radiator);
    });

    // Starbage-Logo auf beiden Radiatorfinnen, auf der Seite, die die Mitflug-Kamera sieht
    const logoMaterial = new THREE.MeshStandardMaterial({
        map: logoTexture,
        transparent: true,
        alphaTest: 0.5,
        metalness: 0.2,
        roughness: 0.55,
        emissiveMap: logoTexture,
        emissive: '#ffffff',
        emissiveIntensity: 0.15,
        polygonOffset: true,
        polygonOffsetFactor: -2
    });
    const logoGeometry = new THREE.PlaneGeometry(3, 3 * 400 / 1024);
    [-1, 1].forEach(side => {
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(-0.2, side * 3.1, 0.035);
        ship.add(logo);
    });

    // Solarflügel an einem Querträger
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 25, 6), darkMaterial);
    boom.rotation.x = Math.PI / 2;
    boom.position.x = 2.5;
    ship.add(boom);
    const panelGeometry = new THREE.BoxGeometry(2.8, 0.06, 5);
    [-1, 1].forEach(side => {
        [4.9, 10.1].forEach(offset => {
            const panel = new THREE.Mesh(panelGeometry, solarMaterial);
            panel.position.set(2.5, 0, side * offset);
            panel.rotation.z = 0.35; // leicht zur Sonne gekippt
            ship.add(panel);
        });
    });

    // Antennenschüssel oben auf dem Kommandomodul
    ship.add(beam(new THREE.Vector3(6.4, 1.3, 0), new THREE.Vector3(6.4, 2.3, 0), 0.07, darkMaterial));
    const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, 0.9),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide })
    );
    dish.rotation.z = Math.PI + 0.4; // Öffnung nach oben
    dish.position.set(6.4, 2.9, 0);
    ship.add(dish);

    // Antriebssektion in Goldfolie, drei Düsen mit Abgasstrahl
    ship.add(alongX(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 3, 20), foilMaterial), -3));
    ship.add(alongX(new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 20), darkMaterial), -4.6));

    const nozzleGeometry = new THREE.ConeGeometry(0.6, 1.4, 16, 1, true);
    const nozzleMaterial = surfaceMaterial(surfaces.nozzle, { metalness: 0.8, side: THREE.DoubleSide });
    const plumeMaterial = new THREE.MeshBasicMaterial({
        color: '#60a5fa', transparent: true, opacity: 0.45,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const coreMaterial = plumeMaterial.clone();
    coreMaterial.color.set('#e0f2fe');
    coreMaterial.opacity = 0.7;
    const plumeGeometry = new THREE.ConeGeometry(0.55, 4, 16, 1, true);
    const coreGeometry = new THREE.ConeGeometry(0.28, 2, 12, 1, true);

    const plumes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const y = Math.cos(angle) * 0.9;
        const z = Math.sin(angle) * 0.9;

        const nozzle = alongX(new THREE.Mesh(nozzleGeometry, nozzleMaterial), -5.4);
        nozzle.position.set(-5.4, y, z);
        ship.add(nozzle);

        // Spitze des Strahls zeigt nach hinten
        [[plumeGeometry, plumeMaterial, 4], [coreGeometry, coreMaterial, 2]].forEach(([geometry, material, length]) => {
            const plume = new THREE.Mesh(geometry as THREE.BufferGeometry, material as THREE.Material);
            plume.rotation.z = Math.PI / 2;
            plume.position.set(-6.1 - (length as number) / 2, y, z);
            plume.userData.baseX = plume.position.x;
            plume.userData.length = length;
            ship.add(plume);
            plumes.push(plume);
        });
    }
    const engineGlow = createGlow(glowTexture, '#60a5fa', 7);
    engineGlow.position.x = -6.4;
    ship.add(engineGlow);

    // Fangsystem: vier Arme tragen den Ring, darin hängt das Netz
    const ringRadius = 3.4;
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const from = new THREE.Vector3(8.6, Math.cos(angle) * 1.25, Math.sin(angle) * 1.25);
        const to = new THREE.Vector3(netMouth.x - 1.5, Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius);
        ship.add(beam(from, to, 0.1, darkMaterial));
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.16, 8, 40), accentMaterial);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = netMouth.x - 1.5;
    ship.add(ring);

    const ringLights: THREE.Sprite[] = [];
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const light = createGlow(glowTexture, '#fbbf24', 0.9);
        light.position.set(netMouth.x - 1.5, Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius);
        ship.add(light);
        ringLights.push(light);
    }

    // Netz als Drahtgitter, Spitze zum Schiff, Öffnung nach vorne
    const netMaterial = new THREE.MeshBasicMaterial({
        color: '#7dd3fc', wireframe: true, transparent: true, opacity: 0.5, depthWrite: false
    });
    const net = new THREE.Mesh(new THREE.ConeGeometry(ringRadius, 5, 16, 6, true), netMaterial);
    net.rotation.z = Math.PI / 2;
    net.position.x = netMouth.x - 4;
    ship.add(net);
    const innerNetMaterial = netMaterial.clone();
    innerNetMaterial.opacity = 0.25;
    const innerNet = new THREE.Mesh(new THREE.ConeGeometry(ringRadius * 0.96, 4.8, 11, 4, true), innerNetMaterial);
    innerNet.rotation.set(0.3, 0, Math.PI / 2);
    innerNet.position.x = netMouth.x - 3.9;
    ship.add(innerNet);

    // Leitstrahl vor dem Netz, nur während des Einfangens sichtbar
    const tractorMaterial = new THREE.MeshBasicMaterial({
        color: '#67e8f9', transparent: true, opacity: 0, visible: false,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const tractor = new THREE.Mesh(new THREE.ConeGeometry(4.4, 8, 32, 1, true), tractorMaterial);
    tractor.rotation.z = Math.PI / 2;
    tractor.position.x = netMouth.x - 1.5 + 4;
    ship.add(tractor);

    // Positionslichter: rot und grün an den Flügelspitzen, weiße Blitzer oben und hinten
    const portLight = createGlow(glowTexture, '#ef4444', 1.8);
    portLight.position.set(2.5, 0, -12.7);
    const starboardLight = createGlow(glowTexture, '#22c55e', 1.8);
    starboardLight.position.set(2.5, 0, 12.7);
    const strobeTop = createGlow(glowTexture, '#ffffff', 2.4);
    strobeTop.position.set(8, 1.9, 0);
    const strobeTail = createGlow(glowTexture, '#ffffff', 2.4);
    strobeTail.position.set(-4.6, 2, 0);
    ship.add(portLight, starboardLight, strobeTop, strobeTail);

    return {
        ship,
        plumes,
        engineGlow,
        ringLights,
        netMaterial,
        innerNetMaterial,
        tractorMaterial,
        navLights: [portLight, starboardLight],
        strobes: [strobeTop, strobeTail]
    };
};

// Unregelmäßiger Brocken: Ecken zufällig verschieben, gleiche Ecken gleich weit,
// damit keine Risse entstehen
const createRockGeometry = (radius: number) => {
    const geometry = new THREE.IcosahedronGeometry(radius, 0);
    const position = geometry.attributes.position;
    const offsets = new Map<string, number>();
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);
        const key = `${vertex.x.toFixed(3)},${vertex.y.toFixed(3)},${vertex.z.toFixed(3)}`;
        if (!offsets.has(key)) offsets.set(key, randomBetween(0.65, 1.3));
        vertex.multiplyScalar(offsets.get(key)!);
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    return geometry;
};

const debrisMaterial = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({
        color,
        metalness: 0.6,
        roughness: 0.55,
        emissive: debrisTint,
        emissiveIntensity: 0.35,
        flatShading: true,
        ...extra
    });

// Vier Sorten Schrott: Brocken, Paneltrümmer, alte Raketenstufe, toter Kleinsatellit
const buildDebris = (kind: number, surfaces: CollectorSurfaces, solarTexture: THREE.Texture) => {
    const group = new THREE.Group();
    const materials: THREE.MeshStandardMaterial[] = [];
    const add = (mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>) => {
        materials.push(mesh.material);
        group.add(mesh);
        return mesh;
    };

    if (kind === 0) {
        add(new THREE.Mesh(
            createRockGeometry(randomBetween(0.7, 1.1)),
            debrisMaterial('#b8bcc2', { ...surfaces.scorched, roughness: 1, bumpScale: 2 })
        ));
    } else if (kind === 1) {
        const shard = add(new THREE.Mesh(
            new THREE.BoxGeometry(randomBetween(1.4, 2.2), 0.06, randomBetween(0.8, 1.3)),
            debrisMaterial('#ffffff', { map: solarTexture, flatShading: false, side: THREE.DoubleSide })
        ));
        shard.rotation.z = 0.2;
    } else if (kind === 2) {
        add(alongX(new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 2.4, 16),
            debrisMaterial('#ffffff', { ...withRepeat(surfaces.wornHull, 1, 0.8), roughness: 1, flatShading: false })
        ), 0));
        add(alongX(new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.3, 12), debrisMaterial('#E47F00')), 0.6));
        add(alongX(new THREE.Mesh(
            new THREE.ConeGeometry(0.45, 0.8, 12, 1, true),
            debrisMaterial('#ffffff', { ...surfaces.nozzle, roughness: 1, side: THREE.DoubleSide })
        ), -1.5));
    } else {
        add(new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.9, 0.9),
            debrisMaterial('#ffffff', { ...surfaces.foil, metalness: 0.7, roughness: 1, bumpScale: 2 })
        ));
        const wing = add(new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.7, 1.6),
            debrisMaterial('#ffffff', { map: solarTexture, flatShading: false, side: THREE.DoubleSide })
        ));
        wing.position.z = 1.2;
        wing.rotation.x = 0.5; // abgeknickt
    }

    return { object: group, materials };
};

const easeInOut = (t: number) => t * t * (3 - 2 * t);

export const useCollectorShip = () => {
    const collected = ref(0);

    let globe: GlobeInstance | null = null;
    let shipObject: THREE.Object3D | null = null;
    let cameraRig: THREE.Object3D | null = null; // folgt dem Schiff im Spielmodus leicht verzögert
    let cameraMode: CollectorCameraMode = 'off';
    let followState: 'off' | 'flying' | 'on' = 'off';
    let flightProgress = 0;
    let savedDistances = { min: 0, max: 0 };
    const flightStartCamera = new THREE.Vector3(); // Koordinaten des Kamera-Ankers
    const flightStartTarget = new THREE.Vector3(); // Weltkoordinaten
    const flightStartUp = new THREE.Vector3();
    const cameraLocal = new THREE.Vector3();
    const steerInput = { x: 0, y: 0 }; // x: +1 rechts, y: +1 hoch (Bildschirm)
    let redistributeDebris: (() => void) | null = null;

    const cameraAnchor = () => (cameraMode === 'steer' ? cameraRig : shipObject);

    // Ohne returnToGlobe bleibt die Kamera stehen, z. B. weil gleich die ISS übernimmt
    const setCameraMode = (mode: CollectorCameraMode, returnToGlobe = true) => {
        if (!globe || !shipObject || mode === cameraMode) return;
        const controls = globe.controls();
        const camera = globe.camera();
        const previous = cameraMode;
        cameraMode = mode;

        // Schrott in den Korridor verteilen bzw. wieder an die Bahnlinie holen
        if (previous === 'steer' || mode === 'steer') redistributeDebris?.();

        if (mode === 'off') {
            followState = 'off';
            steerInput.x = 0;
            steerInput.y = 0;
            controls.enabled = true;
            controls.target.set(0, 0, 0);
            controls.minDistance = savedDistances.min;
            controls.maxDistance = savedDistances.max;
            camera.up.set(0, 1, 0);
            if (returnToGlobe) globe.pointOfView({ altitude: 2.5 }, globeViewTransitionMs);
            return;
        }

        if (previous === 'off') savedDistances = { min: controls.minDistance, max: controls.maxDistance };
        // Im Spielmodus führt nur die Tastatur - Maus-Drehen würde die Verfolgerkamera stören
        controls.enabled = mode !== 'steer';

        const anchor = cameraAnchor()!;
        anchor.updateMatrixWorld();
        flightStartCamera.copy(anchor.worldToLocal(camera.position.clone()));
        flightStartTarget.copy(controls.target);
        flightStartUp.copy(camera.up);
        flightProgress = 0;
        followState = 'flying';
    };

    const follow = (on: boolean, returnToGlobe = true) => setCameraMode(on ? 'follow' : 'off', returnToGlobe);

    const steer = (x: number, y: number) => {
        steerInput.x = x;
        steerInput.y = y;
    };

    const start = ({ world, earthRadiusKm, solarTextureUrl, logoUrl, isRunning }: CollectorShipOptions) => {
        globe = world;
        const scene = world.scene();
        const globeRadius = world.getGlobeRadius();
        const orbitRadius = globeRadius * (1 + (altitudeKm / earthRadiusKm) * altitudeExaggeration);

        const solarTexture = new THREE.TextureLoader().load(solarTextureUrl);
        solarTexture.colorSpace = THREE.SRGBColorSpace;
        const glowTexture = createGlowTexture();
        const surfaces = createCollectorSurfaces();

        // orbit kippt die Bahnebene, pivot dreht das Schiff darin herum
        const orbit = new THREE.Group();
        orbit.rotation.set(THREE.MathUtils.degToRad(inclinationDeg), THREE.MathUtils.degToRad(raanDeg), 0);

        const pivot = new THREE.Group();
        const parts = buildShip(surfaces, solarTexture, glowTexture, createLogoDecalTexture(logoUrl));
        parts.ship.position.set(orbitRadius, 0, 0);
        // Bei Drehung um +Z geht die Bewegung an dieser Stelle nach +Y - Nase mitdrehen.
        // ZYX: erst Rollen um die eigene Längsachse, dann Nicken/Grunddrehung um Z
        parts.ship.rotation.order = 'ZYX';
        parts.ship.rotation.z = Math.PI / 2;
        pivot.add(parts.ship);
        shipObject = parts.ship;

        const rig = new THREE.Object3D();
        rig.position.copy(parts.ship.position);
        rig.rotation.z = Math.PI / 2;
        pivot.add(rig);
        cameraRig = rig;
        orbit.add(pivot);

        // Korridor-Kanten als schwache Leitlinien, nur im Spielmodus sichtbar
        const corridorMaterial = new THREE.LineBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.16 });
        const corridor = new THREE.Group();
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([lateral, radial]) => {
            const radius = orbitRadius + radial * corridorHalfHeight;
            const points: THREE.Vector3[] = [];
            for (let i = 0; i <= 360; i++) {
                const angle = (i / 360) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, lateral * corridorHalfWidth));
            }
            corridor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), corridorMaterial));
        });
        corridor.visible = false;
        orbit.add(corridor);

        // Dünne Bahnlinie, damit man sieht, wo das Schiff als Nächstes aufräumt
        const trackPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= 180; i++) {
            const angle = (i / 180) * Math.PI * 2;
            trackPoints.push(new THREE.Vector3(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0));
        }
        orbit.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(trackPoints),
            new THREE.LineBasicMaterial({ color: '#E47F00', transparent: true, opacity: 0.18 })
        ));

        // Fangblitz an der Netzöffnung
        const captureFlash = createGlow(glowTexture, '#67e8f9', 1);
        captureFlash.material.opacity = 0;
        orbit.add(captureFlash);

        const placeOnOrbit = (piece: DebrisPiece) => {
            const radius = orbitRadius + piece.radialOffset;
            piece.object.position.set(
                Math.cos(piece.angle) * radius,
                Math.sin(piece.angle) * radius,
                piece.lateralOffset
            );
        };

        // Ohne Spielmodus klein genug, dass das Teil durch die Netzöffnung passt,
        // im Spielmodus über den ganzen Korridor verteilt
        const rollOffsets = (piece: DebrisPiece) => {
            const steering = cameraMode === 'steer';
            const width = steering ? corridorHalfWidth : autoOffsetRange;
            const height = steering ? corridorHalfHeight : autoOffsetRange;
            piece.radialOffset = randomBetween(-height, height);
            piece.lateralOffset = randomBetween(-width, width);
        };

        const resetPiece = (piece: DebrisPiece, angle: number) => {
            piece.angle = angle;
            piece.angularSpeed = randomBetween(0.004, 0.02);
            rollOffsets(piece);
            piece.spin.set(randomBetween(-1, 1), randomBetween(-1, 1), randomBetween(-1, 1));
            piece.materials.forEach(material => {
                material.emissive.copy(debrisTint);
                material.emissiveIntensity = 0.35;
            });
            placeOnOrbit(piece);
        };

        const debris: DebrisPiece[] = [];
        for (let i = 0; i < debrisCount + gameDebrisCount; i++) {
            const { object, materials } = buildDebris(i % 4, surfaces, solarTexture);
            object.rotation.set(randomBetween(0, Math.PI), randomBetween(0, Math.PI), 0);
            const piece: DebrisPiece = {
                object,
                materials,
                angle: 0,
                angularSpeed: 0,
                radialOffset: 0,
                lateralOffset: 0,
                spin: new THREE.Vector3(),
                phase: 'drifting',
                timer: 0,
                captureStart: new THREE.Vector3(),
                gameOnly: i >= debrisCount
            };
            // Nicht direkt vor dem Netz starten
            resetPiece(piece, 0.3 + (i / debrisCount) * (Math.PI * 2 - 0.4) + randomBetween(-0.05, 0.05));
            if (piece.gameOnly) {
                piece.phase = 'parked';
                object.visible = false;
            }
            orbit.add(object);
            debris.push(piece);
        }

        scene.add(orbit);

        // Beim Wechsel in den oder aus dem Spielmodus nur Teile umsetzen, die gerade
        // weit weg sind - sonst springt Schrott sichtbar vor dem Netz herum
        redistributeDebris = () => {
            const steering = cameraMode === 'steer';
            debris.forEach(piece => {
                // Zusatzteile: im Spiel irgendwo auf der Bahn einblenden, danach wieder parken
                if (piece.gameOnly) {
                    if (steering && piece.phase === 'parked') {
                        resetPiece(piece, pivot.rotation.z + randomBetween(0.6, Math.PI * 2 - 0.3));
                        piece.object.scale.setScalar(0);
                        piece.object.visible = true;
                        piece.phase = 'spawning';
                        piece.timer = 0;
                    } else if (!steering && piece.phase !== 'capturing') {
                        piece.phase = 'parked';
                        piece.object.visible = false;
                    }
                    return;
                }
                if (piece.phase !== 'drifting' && piece.phase !== 'spawning') return;
                const ahead = THREE.MathUtils.euclideanModulo(piece.angle - pivot.rotation.z, Math.PI * 2);
                if (ahead > 0.6 && ahead < Math.PI * 2 - 0.3) rollOffsets(piece);
            });
        };

        // Lage des Schiffs im Korridor: seitlich (Schiff-Z) und radial (nach außen positiv)
        const steerOffset = { lateral: 0, radial: 0 };
        const steerVelocity = { lateral: 0, radial: 0 };
        const cameraOffset = { lateral: 0, radial: 0 };

        const updateSteering = (dt: number) => {
            const steering = cameraMode === 'steer';
            // Bildschirm rechts ist Schiff -Z (Kamera schaut nach +X, oben ist -Y)
            const targetVelocity = steering
                ? { lateral: -steerInput.x * steerMaxSpeed, radial: steerInput.y * steerMaxSpeed }
                : {
                    lateral: THREE.MathUtils.clamp(-steerOffset.lateral * steerReturn, -steerMaxSpeed, steerMaxSpeed),
                    radial: THREE.MathUtils.clamp(-steerOffset.radial * steerReturn, -steerMaxSpeed, steerMaxSpeed)
                };
            const blend = Math.min(1, dt * steerResponse);
            steerVelocity.lateral += (targetVelocity.lateral - steerVelocity.lateral) * blend;
            steerVelocity.radial += (targetVelocity.radial - steerVelocity.radial) * blend;

            steerOffset.lateral += steerVelocity.lateral * dt;
            steerOffset.radial += steerVelocity.radial * dt;
            if (Math.abs(steerOffset.lateral) > corridorHalfWidth) {
                steerOffset.lateral = Math.sign(steerOffset.lateral) * corridorHalfWidth;
                steerVelocity.lateral = 0;
            }
            if (Math.abs(steerOffset.radial) > corridorHalfHeight) {
                steerOffset.radial = Math.sign(steerOffset.radial) * corridorHalfHeight;
                steerVelocity.radial = 0;
            }

            parts.ship.position.set(orbitRadius + steerOffset.radial, 0, steerOffset.lateral);
            // In die Kurve legen und beim Steigen/Sinken die Nase heben bzw. senken
            parts.ship.rotation.x = -(steerVelocity.lateral / steerMaxSpeed) * 0.45;
            parts.ship.rotation.z = Math.PI / 2 - (steerVelocity.radial / steerMaxSpeed) * 0.2;

            const lag = Math.min(1, dt * steerCameraLag);
            cameraOffset.lateral += (steerOffset.lateral - cameraOffset.lateral) * lag;
            cameraOffset.radial += (steerOffset.radial - cameraOffset.radial) * lag;
            rig.position.set(orbitRadius + cameraOffset.radial, 0, cameraOffset.lateral);

            corridor.visible = steering;
        };

        const mouth = new THREE.Vector3();
        const inside = new THREE.Vector3();
        const toOrbitLocal = (local: THREE.Vector3, target: THREE.Vector3) =>
            orbit.worldToLocal(parts.ship.localToWorld(target.copy(local)));

        const timer = new THREE.Timer();
        let elapsed = 0;
        let netFlash = 0; // 1 direkt nach einem Fang, klingt ab
        let beamBoost = 0;

        const step = () => {
            if (!isRunning()) return;

            timer.update();
            const dt = Math.min(timer.getDelta(), 0.05);
            elapsed += dt;

            // Kameralage relativ zum Schiff merken, bevor es weiterfliegt - so
            // bleiben Drehen und Zoomen des Nutzers beim Mitfliegen erhalten
            const camera = world.camera();
            const steering = cameraMode === 'steer';
            if (followState === 'on' && !steering) cameraLocal.copy(parts.ship.worldToLocal(camera.position.clone()));

            updateSteering(dt);
            pivot.rotation.z = (pivot.rotation.z + shipOrbitSpeed * dt) % (Math.PI * 2);
            orbit.updateMatrixWorld();

            if (followState !== 'off') {
                const controls = world.controls();
                const anchor = steering ? rig : parts.ship;
                const offset = steering ? steerCameraOffset : followOffset;
                const target = anchor.localToWorld((steering ? steerLookAt : followLookAt).clone());
                // Im Spielmodus zeigt "oben" im Bild von der Erde weg, sonst bleibt es beim Globus-Oben
                const up = steering
                    ? shipUpLocal.clone().transformDirection(anchor.matrixWorld)
                    : new THREE.Vector3(0, 1, 0);
                if (followState === 'on' && steering) cameraLocal.copy(offset);

                if (followState === 'flying') {
                    flightProgress = Math.min(1, flightProgress + dt / followFlightDuration);
                    const eased = easeInOut(flightProgress);
                    cameraLocal.copy(flightStartCamera).lerp(offset, eased);
                    target.copy(flightStartTarget.clone().lerp(target, eased));
                    up.copy(flightStartUp.clone().lerp(up, eased).normalize());
                    if (flightProgress >= 1) {
                        followState = 'on';
                        if (!steering) controls.maxDistance = followMaxDistance;
                    }
                }

                controls.minDistance = followMinDistance;
                controls.target.copy(target);
                camera.up.copy(up);
                camera.position.copy(anchor.localToWorld(cameraLocal.clone()));
                camera.lookAt(target);
            }
            toOrbitLocal(netMouth, mouth);
            toOrbitLocal(netInside, inside);

            let capturing = false;

            debris.forEach(piece => {
                const { object } = piece;

                if (piece.phase === 'parked') return;

                if (piece.phase === 'drifting' || piece.phase === 'spawning') {
                    piece.angle += piece.angularSpeed * dt;
                    placeOnOrbit(piece);
                    object.rotation.x += piece.spin.x * dt;
                    object.rotation.y += piece.spin.y * dt;
                    object.rotation.z += piece.spin.z * dt;

                    if (piece.phase === 'spawning') {
                        piece.timer += dt;
                        const t = Math.min(piece.timer / spawnDuration, 1);
                        object.scale.setScalar(t);
                        if (t >= 1) piece.phase = 'drifting';
                    }

                    if (object.position.distanceTo(mouth) < (steering ? steerCaptureRadius : captureRadius)) {
                        piece.phase = 'capturing';
                        piece.timer = 0;
                        piece.captureStart.copy(object.position);
                    }
                } else if (piece.phase === 'capturing') {
                    capturing = true;
                    piece.timer += dt;
                    const t = Math.min(piece.timer / captureDuration, 1);
                    const eased = easeInOut(t);

                    // Ziel wandert mit dem Schiff, deshalb jedes Frame neu mischen
                    object.position.copy(piece.captureStart).lerp(inside, eased);
                    object.scale.setScalar(1 - 0.75 * eased);
                    object.rotation.x += piece.spin.x * dt * 4;
                    object.rotation.y += piece.spin.y * dt * 4;
                    piece.materials.forEach(material => {
                        material.emissive.copy(debrisTint).lerp(captureTint, eased);
                        material.emissiveIntensity = 0.35 + eased * 2;
                    });

                    if (t >= 1) {
                        piece.phase = 'gone';
                        piece.timer = randomBetween(respawnDelay[0], respawnDelay[1]);
                        object.visible = false;
                        collected.value++;
                        netFlash = 1;
                        captureFlash.position.copy(inside);
                    }
                } else {
                    piece.timer -= dt;
                    if (piece.timer <= 0 && piece.gameOnly && !steering) {
                        piece.phase = 'parked';
                    } else if (piece.timer <= 0) {
                        // Irgendwo vor dem Schiff wieder auftauchen, aber nicht direkt vor dem Netz
                        resetPiece(piece, pivot.rotation.z + randomBetween(0.8, Math.PI * 2 - 0.4));
                        object.scale.setScalar(0);
                        object.visible = true;
                        piece.phase = 'spawning';
                        piece.timer = 0;
                    }
                }
            });

            // Netz blitzt nach einem Fang auf, der Leitstrahl leuchtet während des Einfangens
            netFlash = Math.max(0, netFlash - dt * 1.8);
            beamBoost += ((capturing ? 1 : 0) - beamBoost) * Math.min(1, dt * 6);
            parts.netMaterial.opacity = 0.5 + netFlash * 0.5;
            parts.netMaterial.color.set('#7dd3fc').lerp(captureTint, netFlash);
            parts.innerNetMaterial.opacity = 0.25 + netFlash * 0.5;
            parts.tractorMaterial.opacity = beamBoost * 0.12;
            parts.tractorMaterial.visible = beamBoost > 0.02;
            captureFlash.position.copy(inside);
            captureFlash.material.opacity = netFlash;
            captureFlash.scale.setScalar(4 + (1 - netFlash) * 10);

            // Abgasstrahl flackert
            parts.plumes.forEach((plume, index) => {
                const flicker = 0.85 + Math.sin(elapsed * 31 + index * 1.7) * 0.08 + Math.random() * 0.1;
                const length = plume.userData.length as number;
                plume.scale.set(1, flicker, 1);
                plume.position.x = -6.1 - (length * flicker) / 2;
            });
            parts.engineGlow.material.opacity = 0.75 + Math.random() * 0.25;

            // Positionslichter pulsieren, Blitzer kurz alle 1,2 s
            const navPulse = 0.6 + Math.sin(elapsed * 2) * 0.4;
            parts.navLights.forEach(light => { light.material.opacity = navPulse; });
            parts.strobes.forEach((light, index) => {
                light.material.opacity = (elapsed + index * 0.15) % 1.2 < 0.08 ? 1 : 0;
            });
            parts.ringLights.forEach((light, index) => {
                light.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(elapsed * 4 - index * 0.8));
            });

            requestAnimationFrame(step);
        };
        step();
    };

    return { collected, start, follow, setCameraMode, steer };
};
