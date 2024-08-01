<template>
    <div>
        <nav class="absolute top-0 z-10 w-full bg-slate-800 bg-opacity-80">
            <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <a href="/" class="flex items-center space-x-3 rtl:space-x-reverse">
                    <img src="/logo.png" class="h-11" alt="Starbage Logo" />
                </a>
                <button type="button"
                    class="cursor-pointer py-2.5 px-5 me-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">Our
                    Mission</button>

                <button type="button" @click="triggerModal"
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
    </div>
</template>

<script setup lang="ts">
import { useModalStore } from '~/stores/modalStore'; // Import Pinia Store
const { locale, setLocale } = useI18n()
const modalStore = useModalStore(); // Initialize Store

const triggerModal = () => {
    modalStore.toggleModal(true); // Set showModal to true
};
</script>