<template>
    <div>
        <div id="chart"></div>
        <Modal v-if="modalStore.showModal" @close-modal="modalStore.toggleModal(false)" />
        <DebrisModal v-if="modalStore.showDebrisModal" @close-modal="modalStore.toggleDebrisModal(false)" />
        <AboutModal v-if="modalStore.showAboutModal" @close-modal="modalStore.toggleAboutModal(false)" />
    </div>
</template>

<script setup lang="ts">
const currentTime = ref(new Date().toString());
import { ref, onMounted } from 'vue';
import * as THREE from 'three';
import Globe from 'globe.gl';
import * as satellite from 'satellite.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { GlobeInstance } from 'globe.gl';
import type { SatelliteData } from '../types/satteliteData';
import type { SpaceDebris } from '../types/spaceDebris';
import Modal from '~/components/Modal.vue';

const modalStore = useModalStore(); // Initialize Store
const globeStore = useGlobeStore();
const asset = useAssetPath();
const satData = ref<SatelliteData[]>([]);
const location = ref([]);
const world = ref<GlobeInstance | null>(null);
const timeStep = 3 * 1000; // per frame
const earthRadiusKm = 6371; // km
const satSize = 100; // km
const issTargetSize = 24; // groesste Kantenlaenge des ISS-Modells in Globus-Einheiten (Radius = 100)
const issSmoothing = 0.05; // Lerp-Faktor pro Frame für die ISS-Bewegung
const issViewAltitude = 0.9; // Kamerahöhe in Globus-Radien, bei der die ISS das Bild füllt
const followTransitionMs = 1400; // Dauer des Kameraflugs zur ISS

// Material der Satelliten-Layer wird spaeter aus dem Store heraus ein-/ausgeblendet
let satelliteMaterial: THREE.MeshLambertMaterial | null = null;

// Stoppt Animationsschleifen und Intervalle beim Verlassen der Seite
let isRunning = true;
const intervals: ReturnType<typeof setInterval>[] = [];
let userPosition: GeolocationPosition | null = null;

const markerSvg = `<svg viewBox="-4 0 36 36">
      <path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path>
      <circle fill="black" cx="14" cy="14" r="7"></circle>
    </svg>`;

const initGlobe = () => {
    const chartElement = document.getElementById('chart');
    if (!chartElement) {
        console.error('Chart element not found');
        return;
    }
    world.value = Globe({ waitForGlobeReady: true, animateIn: false })(chartElement)
        .globeImageUrl(asset('earth_day.png'))
        .bumpImageUrl(asset('bump.png'))
        // .backgroundImageUrl(asset('bg.png'))
        .objectLat('lat')
        .objectLng('lng')
        .objectAltitude('alt')
        .objectFacesSurface(true)
        .objectLabel('name')
        .atmosphereAltitude(0.26)
        .onGlobeReady(() => {

        })
        .htmlElementsData([{ lat: userPosition?.coords.latitude, lng: userPosition?.coords.longitude }])
        .htmlElement(d => {
            const el = document.createElement('div');
            el.innerHTML = markerSvg;
            el.style.color = 'blue';
            el.style.width = `24px`;

            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';
            el.onclick = () => console.info(d);
            return el;
        });

    // Zoom erlauben, aber begrenzt: nicht in den Globus hinein und nicht ins Nichts
    const controls = world.value.controls();
    controls.enableZoom = true;
    controls.zoomSpeed = 0.6;
    controls.minDistance = world.value.getGlobeRadius() * 1.05;
    controls.maxDistance = world.value.getGlobeRadius() * 8;

    // Auto-rotate
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.15;

    //Start Camera on Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userPosition = position;
                const { latitude, longitude } = userPosition.coords;
                if (world.value) {
                    world.value.pointOfView({ lat: latitude, lng: longitude, altitude: 2.5 });
                } else {
                    console.error('Globus-Instanz ist nicht initialisiert');
                }
            }
        )
    };

    const satelliteGeometry = new THREE.OctahedronGeometry(
        satSize * world.value.getGlobeRadius() / earthRadiusKm / 2,
        0
    );

    satelliteMaterial = new THREE.MeshLambertMaterial({ color: '#7f007d', transparent: true, opacity: 0.7 });
    satelliteMaterial.visible = globeStore.showSatellites;
    world.value.objectThreeObject(() => new THREE.Mesh(satelliteGeometry, satelliteMaterial!));

    setupEnvironment();
    addStarlinkChain();
    addStars();
    addClouds();
    getUserPosition()
    addMoon()
    createISSGroup();
    loadISSModel();
    updateISSPosition();
    intervals.push(setInterval(updateISSPosition, 3500));
    animateISS();
};

// ------------------- Starlink-Kette (simuliert) -------------------
// Erfundene Bahn, keine echten Koordinaten: eine geschlossene Kette in einer
// geneigten Ebene, angelehnt an einen frisch ausgesetzten Starlink-Zug.
const starlinkCount = 64;
const starlinkInclinationDeg = 53; // typische Starlink-Neigung
const starlinkRaanDeg = 25; // Lage der Bahnebene, frei gewählt
const starlinkAltitudeKm = 550;
const starlinkAltitudeExaggeration = 3; // sonst klebt die Kette am Globus
const starlinkOrbitSpeed = 0.0009; // Radiant pro Frame

let starlinkChain: THREE.Group | null = null;

const addStarlinkChain = () => {
    if (!world.value) return;

    const globeRadius = world.value.getGlobeRadius();
    const orbitRadius = globeRadius * (1 + (starlinkAltitudeKm / earthRadiusKm) * starlinkAltitudeExaggeration);

    // orbit kippt die Bahnebene, chain dreht sich darin - das ist die Umlaufbewegung
    const orbit = new THREE.Group();
    orbit.rotation.set(
        THREE.MathUtils.degToRad(starlinkInclinationDeg),
        THREE.MathUtils.degToRad(starlinkRaanDeg),
        0
    );

    const chain = new THREE.Group();
    orbit.add(chain);

    const satelliteGeometry = new THREE.BoxGeometry(3.2, 0.4, 1.1);
    const starlinkMaterial = new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        emissive: '#60a5fa',
        emissiveIntensity: 0.9,
        metalness: 0.4,
        roughness: 0.35
    });

    for (let i = 0; i < starlinkCount; i++) {
        const angle = (i / starlinkCount) * Math.PI * 2;
        const sat = new THREE.Mesh(satelliteGeometry, starlinkMaterial);
        sat.position.set(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0);
        sat.rotation.z = angle + Math.PI / 2; // Längsachse tangential zur Bahn
        chain.add(sat);
    }

    // Dünne Bahnlinie, damit die Kette als Bahn lesbar bleibt
    const trackSegments = 180;
    const trackPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= trackSegments; i++) {
        const angle = (i / trackSegments) * Math.PI * 2;
        trackPoints.push(new THREE.Vector3(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0));
    }
    orbit.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(trackPoints),
        new THREE.LineBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.2 })
    ));

    starlinkChain = chain;
    world.value.scene().add(orbit);

    const step = () => {
        if (!isRunning) return;
        if (starlinkChain) starlinkChain.rotation.z += starlinkOrbitSpeed;
        requestAnimationFrame(step);
    };
    step();
};

// Das ISS-Modell nutzt PBR-Materialien: ohne Environment-Map bleiben Metallflaechen schwarz.
const setupEnvironment = () => {
    if (!world.value) return;

    const scene = world.value.scene();
    const pmremGenerator = new THREE.PMREMGenerator(world.value.renderer());

    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;

    pmremGenerator.dispose();
};

const addStars = () => {
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
        let color = new THREE.Color();
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
    world.value.scene().add(stars);
};

const addClouds = () => {
    // Füge Wolken nur hinzu, wenn die Globe-Komponente geladen ist
    const CLOUDS_IMG_URL = asset('clouds.png');
    const CLOUDS_ALT = 0.004;
    const CLOUDS_ROTATION_SPEED = -0.006;

    new THREE.TextureLoader().load(CLOUDS_IMG_URL, cloudsTexture => {
        const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(world.value.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
            new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
        );
        world.value.scene().add(clouds);

        (function rotateClouds() {
            if (!isRunning) return;
            clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
            requestAnimationFrame(rotateClouds);
        })();
    });
};

const fetchSatelliteData = () => {
    fetch(asset('data.txt'))
        .then(response => response.text())
        .then(rawData => {
            const tleData = rawData.replace(/\r/g, '').split(/\n(?=[^12])/).filter(d => d).map(tle => tle.split('\n'));
            satData.value = tleData
                .map(([name, ...tle]) => ({
                    satrec: satellite.twoline2satrec(...tle),
                    name: name.trim().replace(/^0 /, '')
                }))
                .filter(d => !!satellite.propagate(d.satrec, new Date()).position)
                .slice(0, 2000);
            updateSatellitePositions();
        });
};

const getSpaceDebris = () => {

    function generateRandom(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    function generateSpaceDebrisData(numDebris: number): SpaceDebris[] {
        const debrisData: SpaceDebris[] = [];
        for (let i = 0; i < numDebris; i++) {
            const debrisId = 50000 + i;
            const altitude = i % 3 === 0 ? generateRandom(800, 1000) : (i % 3 === 1 ? 1400 : generateRandom(20000, 36000)); // Abwechselnd zwischen 800-1000 km, 1400 km und GEO
            const debris: SpaceDebris = {
                id: debrisId,
                name: `Debris-${debrisId}`,
                inclination: generateRandom(0, 10), // Inklination nahe dem Äquator, zwischen 0 und 10 Grad
                longitude: generateRandom(0, 360), // Zufällige Längengrade
                perigeeArg: generateRandom(0, 360), // Zufälliges Argument des Perigäums
                meanAnomaly: generateRandom(0, 360), // Zufällige mittlere Anomalie
                altitude: altitude, // Höhe in km
                orbitalPeriod: generateRandom(11.5, 15.0) // Zufällige Umlaufzeit zwischen 11.5 und 15 Stunden
            };
            debrisData.push(debris);
        }
        return debrisData;
    }

    // Generieren von 18.700 Weltraumschrott-Daten und speichern in debrisData
    const debrisData = generateSpaceDebrisData(2000);

    // Ausgabe der gespeicherten Daten
    console.log(debrisData);

    debrisData.forEach(debris => {
        const { inclination, longitude, altitude } = debris; // Angenommene Eigenschaften
        const markerGeometry = new THREE.SphereGeometry(0.5, 0.2, 0.2); // Größe des Markers
        const markerMaterial = new THREE.MeshLambertMaterial({ color: 'red' }); // Farbe des Markers
        const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);

        // Konvertiere Breiten- und Längengrade in Bogenmaß
        const phi = THREE.MathUtils.degToRad(90 - inclination);
        const theta = THREE.MathUtils.degToRad(longitude);

        // Setze die Position des Markers
        const earthRadius = world.value.getGlobeRadius();
        markerMesh.position.setFromSphericalCoords(earthRadius + altitude / 10, phi, theta);

        // Füge den Marker zur Szene hinzu
        world.value.scene().add(markerMesh);
    });
}

const updateSatellitePositions = () => {
    const gmst = satellite.gstime(new Date());
    satData.value.forEach(d => {
        const eci = satellite.propagate(d.satrec, new Date());
        if (eci.position) {
            const gdPos = satellite.eciToGeodetic(eci.position, gmst);

            d.lat = satellite.degreesLat(gdPos.latitude);
            d.lng = satellite.degreesLong(gdPos.longitude);
            d.alt = gdPos.height / earthRadiusKm;
        }
    });
    world.value.objectsData(satData.value);
};

// ---------------------------- ISS ----------------------------
// issPivot trägt Position + Bahnausrichtung, das glTF hängt in einem eigenen
// Holder darin - so kollidiert die Achsenkorrektur des Modells nicht mit der Lage.
let issPivot: THREE.Object3D | null = null;
let issPlaceholder: THREE.Mesh | null = null;
let issHasFix = false;

const issTargetPosition = new THREE.Vector3();
const issTargetQuaternion = new THREE.Quaternion();
const issPreviousPosition = new THREE.Vector3();

const createISSGroup = () => {
    if (!world.value) return;

    issPivot = new THREE.Object3D();
    issPivot.name = 'issGroup';
    issPivot.visible = false; // erst zeigen, wenn eine Position bekannt ist

    // Platzhalter, solange das grosse glTF-Modell noch laedt
    issPlaceholder = new THREE.Mesh(
        new THREE.OctahedronGeometry(issTargetSize / 5, 1),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.5, roughness: 0.4 })
    );
    issPivot.add(issPlaceholder);

    world.value.scene().add(issPivot);
};

const loadISSModel = () => {
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

            if (!issPivot) return;

            if (issPlaceholder) {
                issPivot.remove(issPlaceholder);
                issPlaceholder.geometry.dispose();
                (issPlaceholder.material as THREE.Material).dispose();
                issPlaceholder = null;
            }
            issPivot.add(holder);
        },
        undefined,
        error => console.error('ISS-Modell konnte nicht geladen werden:', error)
    );
};

// Erdzugewandte Lage: +Y des Pivots zeigt nach aussen, +Z in Flugrichtung.
const setISSTarget = (position: THREE.Vector3) => {
    const up = position.clone().normalize();
    const forward = new THREE.Vector3();

    if (issPreviousPosition.lengthSq() > 0) {
        forward.copy(position).sub(issPreviousPosition);
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

    issTargetQuaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, forward));
    issTargetPosition.copy(position);
    issPreviousPosition.copy(position);
};

const updateISSPosition = () => {
    fetch('https://api.wheretheiss.at/v1/satellites/25544')
        .then(response => response.json())
        .then(data => {
            if (!world.value || !issPivot) return;

            const { latitude, longitude, altitude } = data;

            // Wie bisher überhöht dargestellt, sonst klebt die ISS am Globus
            const altitudeRatio = (altitude / 10) / world.value.getGlobeRadius();
            const { x, y, z } = world.value.getCoords(latitude, longitude, altitudeRatio);

            setISSTarget(new THREE.Vector3(x, y, z));

            if (!issHasFix) {
                issPivot.position.copy(issTargetPosition);
                issPivot.quaternion.copy(issTargetQuaternion);
                issPivot.visible = true;
                issHasFix = true;
            }
        })
        .catch(error => {
            console.error('Error fetching ISS position:', error);
        });
};

// Kamera auf die ISS ausrichten. Ohne altitude bleibt der aktuelle Zoom erhalten,
// damit im Verfolgungsmodus weiter gezoomt werden kann.
const focusISS = (transitionMs = 0, altitude?: number) => {
    if (!world.value || !issPivot || !issHasFix) return;

    const { lat, lng } = world.value.toGeoCoords(issPivot.position);

    world.value.pointOfView(
        { lat, lng, altitude: altitude ?? world.value.pointOfView().altitude },
        transitionMs
    );
};

// Der Kameraflug braucht eine bekannte ISS-Position. Wird der Modus vor dem ersten
// Fix aktiviert, startet der Flug nach, sobald die Position da ist.
let followFlightPending = false;
let followFlightUntil = 0;

const startFollowFlight = () => {
    if (!followFlightPending || !issHasFix) return;

    followFlightPending = false;
    followFlightUntil = performance.now() + followTransitionMs;
    focusISS(followTransitionMs, issViewAltitude);
};

// Die API liefert nur alle 3,5 s - dazwischen wird interpoliert, damit die ISS gleitet.
const animateISS = () => {
    const step = () => {
        if (!isRunning) return;

        if (issPivot && issHasFix) {
            issPivot.position.lerp(issTargetPosition, issSmoothing);
            issPivot.quaternion.slerp(issTargetQuaternion, issSmoothing);

            startFollowFlight();
            // Während des Kamerafluges nicht dazwischenfunken, danach mitziehen
            if (globeStore.followISS && performance.now() > followFlightUntil) focusISS();
        }
        requestAnimationFrame(step);
    };
    step();
};

watch(() => globeStore.followISS, following => {
    if (!world.value) return;

    world.value.controls().autoRotate = !following;

    if (following) {
        followFlightPending = true;
        startFollowFlight();
    } else {
        followFlightPending = false;
        world.value.pointOfView({ altitude: 2.5 }, followTransitionMs);
    }
});

watch(() => globeStore.showSatellites, visible => {
    if (satelliteMaterial) satelliteMaterial.visible = visible;
});

const startFrameTicker = () => {
    intervals.push(setInterval(() => {
        currentTime.value = new Date().toString();
        updateSatellitePositions();
    }, timeStep));
};

const getUserPosition = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userPosition = position;
                const { latitude, longitude } = userPosition.coords;
                location.value = userPosition.coords

                // Erzeuge rote Kugel mit größerem Radius
                const markerGeometry = new THREE.ConeGeometry(1.65, 10, 15);
                const markerMaterial = new THREE.MeshPhongMaterial({ color: '#E47F00' }); // Ändere das Material
                const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);

                // Konvertiere Breiten- und Längengrade in Bogenmaß
                const phi = THREE.MathUtils.degToRad(90 - latitude); // Konvertiere Breitengrad in phi
                const theta = THREE.MathUtils.degToRad(longitude); // Konvertiere Längengrad in theta

                // Radius der Erde
                const earthRadius = world.value.getGlobeRadius();

                // Setze Position der roten Kugel auf der Oberfläche der Erde
                markerMesh.position.setFromSphericalCoords(earthRadius + 4.5, phi, theta);

                markerMesh.rotateX(THREE.MathUtils.degToRad(230));

                // Füge die rote Kugel zur Szene hinzu
                world.value.scene().add(markerMesh);
            },
            error => {
                console.error('Error getting user location:', error);
            }
        );
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
};

const addMoon = () => {
    // Position des Mondes und der Erde
    const moonDistance = 40000; // Durchschnittliche Entfernung zwischen Erde und Mond in km
    const moonRadius = 1737.4; // Radius des Mondes in km

    // Zeitvariablen für die Orbitbewegung des Mondes
    let time = 0;
    const orbitPeriodSeconds = 2360590; // Umlaufzeit des Mondes um die Erde in Sekunden
    const framesPerSecond = 60; // Frames pro Sekunde

    const orbitSpeed = (2 * Math.PI) / (orbitPeriodSeconds * framesPerSecond); // Geschwindigkeit, mit der sich der Mond um die Erde bewegt (experimentell anpassen)

    // Erstellen Sie eine Mesh-Instanz für den Mond
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 32, 32);

    // Laden Sie die Textur für den Mond
    const textureLoader = new THREE.TextureLoader();
    const moonTexture = textureLoader.load(asset('moon.jpg'));

    // Erstellen Sie das Material mit der Textur für den Mond
    const moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture });

    // Erstellen Sie den Mesh des Mondes mit dem Material
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);

    // Fügen Sie den Mond zur Szene hinzu
    world.value.scene().add(moonMesh);

    // Fügen Sie eine Lichtquelle hinzu
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // weiches weißes Licht
    world.value.scene().add(ambientLight);

    // Funktion zur Aktualisierung der Position des Mondes
    const updateMoonPosition = () => {
        // Berechnen Sie die neue Position des Mondes basierend auf der Zeit
        const angle = time * orbitSpeed;
        const newX = Math.cos(angle) * moonDistance;
        const newZ = Math.sin(angle) * moonDistance;
        moonMesh.position.set(newX, 0, newZ);

        // Inkrementieren Sie die Zeit für die nächste Aktualisierung
        time += 1;
    };

    // Aktualisieren Sie die Position des Mondes in jedem Frame
    const animate = () => {
        if (!isRunning) return;
        updateMoonPosition();
        requestAnimationFrame(animate);
    };
    animate();
};

onMounted(() => {
    isRunning = true;
    initGlobe()
    fetchSatelliteData()
    startFrameTicker()
    getSpaceDebris()
});

onUnmounted(() => {
    isRunning = false;
    intervals.forEach(clearInterval);
    intervals.length = 0;
});
</script>