<template>
    <div>
        <div id="chart"></div>
        <div
            class="pointer-events-none fixed bottom-20 left-4 z-10 flex items-center gap-2 rounded-md bg-slate-800 bg-opacity-80 px-3 py-2 text-sm text-white max-sm:bottom-28">
            <span class="h-2 w-2 animate-pulse rounded-full bg-[#E47F00]"></span>
            {{ $t('collector.counter') }}: <span class="font-semibold tabular-nums">{{ collectedDebris }}</span>
        </div>
        <div v-show="hazeOpacity > 0" class="pointer-events-none fixed inset-0 z-[1]"
            :style="{ opacity: hazeOpacity, background: hazeGradient }"></div>
        <p v-if="satelliteMapVisible"
            class="pointer-events-none fixed bottom-20 right-4 z-10 rounded bg-slate-900/70 px-2 py-1 text-[11px] text-slate-300 max-sm:bottom-28">
            {{ $t('tiles.attribution') }}
        </p>
        <Transition enter-from-class="opacity-0" leave-to-class="opacity-0"
            enter-active-class="transition-opacity duration-500" leave-active-class="transition-opacity duration-1000">
            <div v-if="showSteerHint"
                class="pointer-events-none fixed bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-md bg-slate-900/85 px-4 py-2 text-sm text-slate-100 shadow-lg max-sm:bottom-40">
                {{ $t('collector.steerHint') }}
            </div>
        </Transition>
        <Modal v-if="modalStore.showModal" @close-modal="modalStore.toggleModal(false)" />
        <DebrisModal v-if="modalStore.showDebrisModal" @close-modal="modalStore.toggleDebrisModal(false)" />
        <AboutModal v-if="modalStore.showAboutModal" @close-modal="modalStore.toggleAboutModal(false)" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import Modal from '~/components/Modal.vue';
import { EARTH_RADIUS_KM, type SceneContext } from '~/scene/context';
import { createGlobe } from '~/scene/globe';
import { getSubsolarPoint } from '~/scene/sunPosition';
import { createSun } from '~/scene/sun';
import { createDayNight } from '~/scene/dayNight';
import { setupEnvironment } from '~/scene/environment';
import { addStars } from '~/scene/stars';
import { createClouds } from '~/scene/clouds';
import { addMoon } from '~/scene/moon';
import { addDebrisCloud } from '~/scene/debrisCloud';
import { createSatellites } from '~/scene/satellites';
import { createUserLocation } from '~/scene/userLocation';
import { createIss } from '~/scene/iss';
import { createSatelliteMap, hazeGradient } from '~/scene/satelliteMap';
import { createAutoRotation } from '~/scene/autoRotation';
import { createStarlinkConstellation } from '~/scene/starlink';
import { createCollectorShip } from '~/scene/collectorShip';

/**
 * Setzt die Szene aus den Modulen in scene/ zusammen und verbindet sie mit den Stores.
 * Die Features selbst stecken in den Modulen, hier passiert nur das Verdrahten.
 */

const modalStore = useModalStore();
const globeStore = useGlobeStore();
const asset = useAssetPath();

const sceneTickMs = 3000; // Sonnenstand und Satellitenpositionen

// Stoppt Animationsschleifen und Intervalle beim Verlassen der Seite
let isRunning = true;
const intervals: ReturnType<typeof setInterval>[] = [];

const collectorShip = createCollectorShip();
const starlink = createStarlinkConstellation();
const collectedDebris = collectorShip.collected;

const { showSteerHint } = useSteerKeyboard({
    isSteering: () => globeStore.steerShip,
    stopSteering: () => globeStore.toggleSteerShip(false),
    steer: collectorShip.steer
});

// Für das Template - die Karte selbst entsteht erst in onMounted
const satelliteMapVisible = ref(false);
const hazeOpacity = ref(0);

let satellites: ReturnType<typeof createSatellites> | null = null;
let iss: ReturnType<typeof createIss> | null = null;

const initScene = () => {
    const container = document.getElementById('chart');
    if (!container) {
        console.error('Chart element not found');
        return;
    }

    let dayNight: ReturnType<typeof createDayNight> | null = null;
    const world = createGlobe(container, { asset, onReady: () => dayNight?.apply() });
    const context: SceneContext = { world, asset, isRunning: () => isRunning };

    dayNight = createDayNight(context);
    setupEnvironment(context);
    const sun = createSun(context);
    starlink.start({ world, earthRadiusKm: EARTH_RADIUS_KM, visible: globeStore.showStarlink, isRunning: context.isRunning });
    collectorShip.start({
        world,
        earthRadiusKm: EARTH_RADIUS_KM,
        solarTextureUrl: asset('solarpanel.jpg'),
        logoUrl: asset('logo.png'),
        isRunning: context.isRunning
    });
    addStars(context);
    const clouds = createClouds(context);
    const userLocation = createUserLocation(context);
    addMoon(context);
    addDebrisCloud(context);
    satellites = createSatellites(context, globeStore.showSatellites);
    iss = createIss(context, { isFollowing: () => globeStore.followISS });

    const autoRotation = createAutoRotation(context, {
        isCameraFree: () => globeStore.shipCameraMode === 'off' && !globeStore.followISS
    });

    // Beim Heranzoomen blenden Tag/Nacht-Globus, Wolken und Standortkegel aus
    createSatelliteMap(context, {
        onFrame: ({ altitude, blend, tilesLoaded, haze }) => {
            dayNight?.setMapBlend(blend, tilesLoaded);
            clouds.setFade(blend);
            userLocation.setMarkerVisible(blend < 0.5);
            autoRotation.update(altitude, blend);
            satelliteMapVisible.value = blend > 0.5;
            hazeOpacity.value = haze;
        }
    });

    const tick = () => {
        const sunPoint = getSubsolarPoint(new Date());
        sun.update(sunPoint);
        dayNight?.setSun(sunPoint);
        satellites?.update();
    };
    tick();
    intervals.push(setInterval(tick, sceneTickMs));
};

// Muss vor dem ISS-Watcher stehen: beim Wechsel Schiff -> ISS erst die Kamera
// vom Schiff lösen, dann fliegt die ISS-Ansicht los
watch(() => globeStore.shipCameraMode, mode => {
    collectorShip.setCameraMode(mode, !globeStore.followISS);
});

// Übernimmt gerade das Schiff die Kamera, nicht dazwischen zurückzoomen
watch(() => globeStore.followISS, following => {
    iss?.setFollow(following, globeStore.shipCameraMode === 'off');
});

watch(() => globeStore.showStarlink, visible => starlink.setVisible(visible));

watch(() => globeStore.showSatellites, visible => satellites?.setVisible(visible));

onMounted(() => {
    isRunning = true;
    initScene();
});

onUnmounted(() => {
    isRunning = false;
    iss?.stop();
    intervals.forEach(clearInterval);
    intervals.length = 0;
});
</script>
