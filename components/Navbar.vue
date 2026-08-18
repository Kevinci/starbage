<template>
    <div>
        <nav class="fixed top-0 z-10 w-full bg-slate-800 bg-opacity-80">
            <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <NuxtLink to="/" class="flex items-center space-x-3 rtl:space-x-reverse">
                    <img :src="asset('logo.png')" class="h-11" alt="Starbage Logo" />
                </NuxtLink>

                <!-- Desktop -->
                <div class="max-md:hidden flex items-center">
                    <div class="flex items-center">
                        <button v-for="action in actions" :key="action.key" type="button" :class="actionClass(action)"
                            @click="action.onClick">{{ action.label }}</button>
                    </div>
                    <LocaleSwitch />
                </div>

                <!-- Burger -->
                <button data-collapse-toggle="navbar-default" type="button"
                    class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-400 rounded-lg md:hidden hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600"
                    aria-controls="navbar-default" :aria-expanded="isNavbarVisible" @click="toggleNavbar">
                    <span class="sr-only">Open main menu</span>
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 17 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M1 1h15M1 7h15M1 13h15" />
                    </svg>
                </button>

                <!-- Mobile -->
                <div :class="{ 'hidden': !isNavbarVisible, 'block': isNavbarVisible }"
                    class="md:hidden w-full md:w-auto pt-4" id="navbar-default">
                    <div class="flex flex-col items-stretch gap-2">
                        <button v-for="action in actions" :key="`mobile-${action.key}`" type="button"
                            :class="actionClass(action)" @click="action.onClick">{{ action.label }}</button>
                    </div>
                    <LocaleSwitch class="mt-2" />
                </div>

            </div>
        </nav>
    </div>
</template>

<script setup lang="ts">
import { useModalStore } from '~/stores/modalStore'; // Import Pinia Store
import { useGlobeStore } from '~/stores/globeStore';

const { t } = useI18n();
const asset = useAssetPath();
const modalStore = useModalStore(); // Initialize Store
const globeStore = useGlobeStore();

type NavAction = { key: string; label: string; onClick: () => void; active?: boolean; extraClass?: string };

const actions = computed<NavAction[]>(() => [
    {
        key: 'iss-info',
        label: t('crew.button'),
        onClick: () => modalStore.toggleModal(true),
    },
    {
        key: 'about',
        label: t('about.button'),
        onClick: () => modalStore.toggleAboutModal(true),
    },
    {
        key: 'debris-info',
        label: t('debris.button'),
        onClick: () => modalStore.toggleDebrisModal(true),
    },
    {
        key: 'satellites',
        label: t('satellites'),
        onClick: () => globeStore.toggleSatellites(),
        active: globeStore.showSatellites,
    },
    {
        key: 'follow-iss',
        label: globeStore.followISS ? t('issUnfollow') : t('issFollow'),
        onClick: () => globeStore.toggleFollowISS(),
        active: globeStore.followISS,
    },
]);

const baseClass = 'cursor-pointer py-2.5 px-5 me-2 text-sm font-medium rounded-lg border transition-colors focus:z-10 focus:outline-none focus:ring-4';
const idleClass = 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700';
const activeClass = 'bg-fuchsia-600 text-white border-fuchsia-500 hover:bg-fuchsia-500 focus:ring-fuchsia-900';

const actionClass = (action: NavAction) =>
    [baseClass, action.active ? activeClass : idleClass, action.extraClass].filter(Boolean).join(' ');

const isNavbarVisible = ref(false);

const toggleNavbar = () => {
    isNavbarVisible.value = !isNavbarVisible.value;
};
</script>
