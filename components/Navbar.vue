<template>
    <nav ref="navRoot" class="fixed top-0 z-20 w-full border-b border-slate-700/60 bg-slate-900/85 backdrop-blur">
        <div class="mx-auto flex h-12 max-w-screen-xl items-center justify-between px-4">
            <NuxtLink to="/" class="flex items-center">
                <img :src="asset('logo.png')" class="h-7" alt="Starbage Logo" />
            </NuxtLink>

            <!-- Desktop -->
            <div class="flex items-center gap-1 max-md:hidden">
                <div v-for="group in groups" :key="group.key" class="relative">
                    <button type="button"
                        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                        :class="openMenu === group.key ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
                        :aria-expanded="openMenu === group.key" aria-haspopup="menu" @click="toggleMenu(group.key)">
                        {{ group.label }}
                        <span v-if="group.highlight" class="h-1.5 w-1.5 rounded-full bg-fuchsia-500"></span>
                        <svg class="h-3 w-3 transition-transform" :class="{ 'rotate-180': openMenu === group.key }"
                            viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                                stroke-linejoin="round" />
                        </svg>
                    </button>

                    <div v-if="openMenu === group.key" role="menu"
                        class="absolute right-0 mt-1.5 min-w-56 overflow-hidden rounded-lg border border-slate-700 bg-slate-800/95 py-1 shadow-xl backdrop-blur">
                        <button v-for="item in group.items" :key="item.key" type="button" role="menuitem"
                            class="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                            @click="select(item)">
                            {{ item.label }}
                            <span v-if="item.kind !== 'action'" :class="indicatorClass(item)"></span>
                        </button>
                    </div>
                </div>

                <span class="mx-2 h-5 w-px bg-slate-700"></span>
                <LocaleSwitch />
            </div>

            <!-- Burger -->
            <button type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600 md:hidden"
                aria-controls="navbar-mobile" :aria-expanded="isMobileOpen" @click="isMobileOpen = !isMobileOpen">
                <span class="sr-only">Open main menu</span>
                <svg class="h-5 w-5" aria-hidden="true" fill="none" viewBox="0 0 17 14">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M1 1h15M1 7h15M1 13h15" />
                </svg>
            </button>
        </div>

        <!-- Mobile -->
        <div v-if="isMobileOpen" id="navbar-mobile" class="border-t border-slate-700/60 px-4 pb-4 md:hidden">
            <div v-for="group in groups" :key="`mobile-${group.key}`" class="pt-3">
                <p class="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{{ group.label }}</p>
                <button v-for="item in group.items" :key="`mobile-${item.key}`" type="button"
                    class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                    @click="select(item)">
                    {{ item.label }}
                    <span v-if="item.kind !== 'action'" :class="indicatorClass(item)"></span>
                </button>
            </div>
            <LocaleSwitch class="mt-3 justify-start" />
        </div>
    </nav>
</template>

<script setup lang="ts">
import { useModalStore } from '~/stores/modalStore';
import { useGlobeStore } from '~/stores/globeStore';

const { t } = useI18n();
const asset = useAssetPath();
const modalStore = useModalStore();
const globeStore = useGlobeStore();

// action: öffnet etwas, toggle: an/aus, choice: eine von mehreren Optionen
type MenuItem = { key: string; label: string; kind: 'action' | 'toggle' | 'choice'; active?: boolean; onClick: () => void };
type MenuGroup = { key: string; label: string; highlight?: boolean; items: MenuItem[] };

const groups = computed<MenuGroup[]>(() => [
    {
        key: 'info',
        label: t('nav.info'),
        items: [
            { key: 'iss-info', kind: 'action', label: t('crew.button'), onClick: () => modalStore.toggleModal(true) },
            { key: 'debris-info', kind: 'action', label: t('debris.button'), onClick: () => modalStore.toggleDebrisModal(true) },
            { key: 'about', kind: 'action', label: t('about.button'), onClick: () => modalStore.toggleAboutModal(true) },
        ],
    },
    {
        key: 'view',
        label: t('nav.view'),
        items: [
            {
                key: 'satellites', kind: 'toggle', label: t('nav.satellites'),
                active: globeStore.showSatellites, onClick: () => globeStore.toggleSatellites(),
            },
            {
                key: 'starlink', kind: 'toggle', label: t('nav.starlink'),
                active: globeStore.showStarlink, onClick: () => globeStore.toggleStarlink(),
            },
        ],
    },
    {
        key: 'camera',
        label: t('nav.camera'),
        highlight: globeStore.followISS || globeStore.followShip,
        items: [
            {
                key: 'camera-globe', kind: 'choice', label: t('nav.cameraGlobe'),
                active: !globeStore.followISS && !globeStore.followShip,
                onClick: () => { globeStore.toggleFollowISS(false); globeStore.toggleFollowShip(false); },
            },
            {
                key: 'camera-iss', kind: 'choice', label: t('nav.cameraIss'),
                active: globeStore.followISS, onClick: () => globeStore.toggleFollowISS(true),
            },
            {
                key: 'camera-ship', kind: 'choice', label: t('nav.cameraShip'),
                active: globeStore.followShip, onClick: () => globeStore.toggleFollowShip(true),
            },
        ],
    },
]);

const openMenu = ref<string | null>(null);
const isMobileOpen = ref(false);
const navRoot = ref<HTMLElement | null>(null);

const toggleMenu = (key: string) => {
    openMenu.value = openMenu.value === key ? null : key;
};

// Schalter lassen das Menü offen, damit man mehrere nacheinander setzen kann
const select = (item: MenuItem) => {
    item.onClick();
    if (item.kind !== 'toggle') {
        openMenu.value = null;
        isMobileOpen.value = false;
    }
};

const indicatorClass = (item: MenuItem) => {
    if (item.kind === 'toggle') {
        return ['h-3 w-3 rounded-sm border', item.active ? 'border-fuchsia-500 bg-fuchsia-500' : 'border-slate-500'];
    }
    return ['h-3 w-3 rounded-full border', item.active ? 'border-fuchsia-500 bg-fuchsia-500' : 'border-slate-500'];
};

const closeOnOutsideClick = (event: PointerEvent) => {
    if (navRoot.value && !navRoot.value.contains(event.target as Node)) openMenu.value = null;
};
const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') openMenu.value = null;
};

onMounted(() => {
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
});

onUnmounted(() => {
    document.removeEventListener('pointerdown', closeOnOutsideClick);
    document.removeEventListener('keydown', closeOnEscape);
});
</script>
