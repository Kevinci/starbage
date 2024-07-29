<template>
    <div>
        <nav class="absolute top-0 z-10 w-full bg-slate-800 bg-opacity-80">
            <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <a href="#" class="flex items-center space-x-3 rtl:space-x-reverse">
                    <img src="/logo.png" class="h-11" alt="Starbage Logo" />
                </a>
                <button type="button" @click="openModal"
                    class="cursor-pointer py-2.5 px-5 me-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">Our
                    Mission</button>

                <button type="button" @click="openModal"
                    class="cursor-pointer py-2.5 px-5 me-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">ISS
                    Information</button>
                <button id="hideShow"
                    class="cursor-pointer py-2.5 px-5 me-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
                    {{ $t('spacedebris') }}</button>
                <button data-collapse-toggle="navbar-default" type="button"
                    class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                    aria-controls="navbar-default" aria-expanded="false">
                    <span class="sr-only">Open main menu</span>
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 17 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M1 1h15M1 7h15M1 13h15" />
                    </svg>
                </button>
                <div class="hidden w-full md:block md:w-auto" id="navbar-default">
                </div>
                <div class="flex flex-row justify-center select-none">
                    <div class="flex flex-row items-center right-1 ">
                        <button @click="setLocale('de')" class="p-2 text-sm font-medium text-gray-50">DE
                        </button>
                        <button @click="setLocale('en')" class="p-2 text-sm font-medium text-gray-50">EN
                        </button>
                    </div>

                </div>
            </div>
        </nav>
        <div id="chart">
        </div>
        <footer class="grid grid-cols-2 absolute bottom-0 p-4 z-10 w-full bg-slate-800 bg-opacity-80 ">
            <p class="font-bold font-sans text-left text-gray-50">
            <div class="block py-2 px-3 text-white" id="time-log">{{ currentTime }}</div>
            </p>
            <p class="font-bold font-sans text-right text-gray-50">
            <ul class="font-bold justify-end flex content-between">
                <li>
                    <NuxtLink to="/imprint">{{ $t('imprint') }}</NuxtLink>
                </li>
                <li>
                    <NuxtLink to="/privacy">{{ $t('privacy') }}</NuxtLink>
                </li>
            </ul>
            </p>
        </footer>
        <!-- Main modal -->
        <div id="default-modal" v-show="showDialog"
            class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-h-full max-w-4xl">
                <!-- Modal content -->
                <div class="relative bg-white rounded-lg shadow dark:bg-gray-700/75">
                    <!-- Modal header -->
                    <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                            Information about ISS
                        </h3>
                        <button type="button" @click="closeModal"
                            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                            data-modal-hide="default-modal">
                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                                viewBox="0 0 14 14">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                            <span class="sr-only">Close modal</span>
                        </button>
                    </div>
                    <!-- Modal body -->
                    <div class="p-4 md:p-5 space-y-4">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                            The following astronauts are currently on the ISS</h3>
                        <ul class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                            <li v-for="(item, index) in issInfo" :key="index">{{ item.name }}</li>
                        </ul>
                    </div>
                    <!-- Modal footer -->
                    <div class="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">

                        <button @click="closeModal" type="button"
                            class="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const { locale, setLocale } = useI18n()
import { ref, onMounted } from 'vue';
import * as THREE from 'three';
import Globe from 'globe.gl';
import * as satellite from 'satellite.js';
import type { GlobeInstance } from 'globe.gl';
import type { SatelliteData } from '../types/satteliteData';
import type { ISSInfo } from '../types/issInformation';

const currentTime = ref(new Date().toString());
const satData = ref<SatelliteData[]>([]);
const issInfo = ref<ISSInfo[]>([]);
const location = ref([]);
const world = ref<GlobeInstance | null>(null);
const timeStep = 3 * 1000; // per frame
const earthRadiusKm = 6371; // km
const satSize = 100; // km
let userPosition: GeolocationPosition | null = null;
const showDialog = ref(false);
const dialogContent = ref('Informationen zur ISS');

const closeModal = () => {
    showDialog.value = false;
};

const openModal = () => {
    showDialog.value = true;
};

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
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-day.jpg')
        .bumpImageUrl('/bump.png')
        // .backgroundImageUrl('/bg.png')
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
            console.log('hello', userPosition?.coords.latitude);

            el.innerHTML = markerSvg;
            el.style.color = 'blue';
            el.style.width = `24px`;

            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';
            el.onclick = () => console.info(d);
            return el;
        });

    //Zoom False
    world.value.controls().enableZoom = false

    // Auto-rotate
    world.value.controls().autoRotate = true;
    world.value.controls().autoRotateSpeed = 0.15;

    //Start Camera on Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userPosition = position;
                const { latitude, longitude } = userPosition.coords;
                console.log('coords', userPosition.coords);
                if (world.value) {
                    world.value.pointOfView({ lat: latitude, lng: longitude, altitude: 2.5 });
                } else {
                    console.error('Globus-Instanz ist nicht initialisiert');
                }
            }
        )
    };

    const debrisGeometry = new THREE.OctahedronGeometry(
        satSize * world.value.getGlobeRadius() / earthRadiusKm / 2,
        0
    );

    const debrisMaterial = new THREE.MeshLambertMaterial({ color: '#3B83F6', transparent: true, opacity: 0.7 });
    world.value.objectThreeObject(() => new THREE.Mesh(debrisGeometry, debrisMaterial));

    debrisMaterial.visible = false;

    const hideShowButton = document.getElementById("hideShow");
    if (hideShowButton) {
        hideShowButton.addEventListener("click", function () {
            debrisMaterial.visible = !debrisMaterial.visible;
        });
    }

    addStars();
    addClouds();
    getUserPosition()
    addMoon()
    setInterval(updateISSPosition, 4500);
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
    const CLOUDS_IMG_URL = '/clouds.png';
    const CLOUDS_ALT = 0.004;
    const CLOUDS_ROTATION_SPEED = -0.006;

    new THREE.TextureLoader().load(CLOUDS_IMG_URL, cloudsTexture => {
        const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(world.value.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
            new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
        );
        world.value.scene().add(clouds);

        (function rotateClouds() {
            clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
            requestAnimationFrame(rotateClouds);
        })();
    });
};

const fetchSatelliteData = () => {
    fetch('data.txt')
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

const fetchISSInfo = () => {
    fetch('http://api.open-notify.org/astros.json')
        .then(response => response.json())
        .then(data => {
            issInfo.value = data.people
        })
        .catch(error => {
            console.error('Fehler beim Abrufen der ISS-Informationen:', error);
        });
};


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

// Funktion zum Aktualisieren der Position der ISS und der Flügel
const updateISSPosition = () => {
    fetch('http://api.open-notify.org/iss-now.json')
        .then(response => response.json())
        .then(data => {
            const { latitude, longitude } = data.iss_position;

            // Höhe der ISS über der Erde (in Kilometern)
            const ISS_HEIGHT = 40; // Beispielhöhe von 400 km über der Erde

            // Konvertiere Breiten- und Längengrade in Bogenmaß
            const phi = THREE.MathUtils.degToRad(90 - latitude); // Breitengrad in phi
            const theta = THREE.MathUtils.degToRad(longitude); // Längengrad in theta

            // Radius der Erde
            const earthRadius = world.value.getGlobeRadius();

            // Position der ISS aktualisieren
            const issPosition = new THREE.Vector3().setFromSphericalCoords(
                earthRadius + ISS_HEIGHT, // Radius der ISS (Erdradius plus Höhe)
                phi, // Breitengrad
                theta // Längengrad
            );

            // Überprüfen, ob die ISS bereits vorhanden ist
            let issGroup = world.value.scene().getObjectByName('issGroup');

            if (!issGroup) {
                // Erstelle die ISS-Gruppe
                issGroup = createISSGroup();
                world.value.scene().add(issGroup);
            }

            // Aktualisieren Sie die Position der ISS-Gruppe
            issGroup.position.copy(issPosition);

            console.log('ISS position updated:', issPosition);
        })
        .catch(error => {
            console.error('Error fetching ISS position:', error);
        });
};

// Funktion zum Erstellen der ISS-Gruppe und ihrer Komponenten
const createISSGroup = () => {
    const ISS_HEIGHT = 40; // Höhe der ISS über der Erde in Kilometern
    const ISS_RADIUS = 1; // Radius der ISS-Kugel

    // Erstelle die ISS-Gruppe
    const issGroup = new THREE.Object3D();
    issGroup.name = 'issGroup'; // Geben Sie der Gruppe einen Namen, um sie später identifizieren zu können

    // Hier werden der Raycaster und der Vektor für die Mausposition definiert
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Erstelle die ISS-Kapsel
    const issMaterial = new THREE.MeshPhongMaterial({ color: '#FFFFFF' });
    const issGeometry = new THREE.CylinderGeometry(ISS_RADIUS, 1, 20, 32);
    const issMesh = new THREE.Mesh(issGeometry, issMaterial);
    issGroup.add(issMesh);

    // Erstelle den weißen Zylinder
    const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 32);
    const cylinderMaterial = new THREE.MeshPhongMaterial({ color: '#FFFFFF' });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(0, 0, 1);
    cylinder.rotation.set(Math.PI / 2, 0, 0);
    issGroup.add(cylinder);

    // Erstelle Flügel
    const wingGeometry = new THREE.BoxGeometry(1, 10, 2.5);
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 'lightblue' });

    const wingPositions = [
        { x: 0, y: 10, z: 6, rotation: Math.PI / 2 },    // Rechter Flügel 1
        { x: 0, y: 10, z: -6, rotation: Math.PI / 2 },   // Linker Flügel 1
        { x: 0, y: 5, z: 6, rotation: Math.PI / 2 },     // Rechter Flügel 2
        { x: 0, y: 5, z: -6, rotation: Math.PI / 2 },    // Linker Flügel 2
        { x: 0, y: -5, z: -6, rotation: -Math.PI / 2 },  // Rechter Flügel 3
        { x: 0, y: -5, z: 6, rotation: -Math.PI / 2 },   // Linker Flügel 3
        { x: 0, y: -10, z: -6, rotation: -Math.PI / 2 }, // Rechter Flügel 4
        { x: 0, y: -10, z: 6, rotation: -Math.PI / 2 }   // Linker Flügel 4
    ];

    wingPositions.forEach(position => {
        const wing = new THREE.Mesh(wingGeometry, wingMaterial);
        wing.position.set(position.x, position.y, position.z);
        wing.rotation.set(position.rotation, 0, 0);
        issGroup.add(wing);
    });

    // Skalieren und Rotieren der ISS-Gruppe
    issGroup.scale.set(0.5, 0.5, 0.5);
    issGroup.rotation.set(earthRadiusKm, Math.PI / 2, 85);

    return issGroup;
};

const startFrameTicker = () => {
    setInterval(() => {
        currentTime.value = new Date().toString();
        updateSatellitePositions();
    }, timeStep);
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

                console.log('User position:', markerMesh.position);
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
    const moonTexture = textureLoader.load('/moon.jpg');

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
        updateMoonPosition();
        requestAnimationFrame(animate);
    };
    animate();
};

onMounted(() => {
    initGlobe()
    fetchSatelliteData()
    startFrameTicker()
    addMoon()
    getUserPosition()
    fetchISSInfo()
});
</script>