<template>
    <div>
        <!-- Main modal -->
        <div id="default-modal"
            class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-h-full max-w-4xl">
                <!-- Modal content -->
                <div class="relative bg-white rounded-lg shadow dark:bg-gray-700/75">
                    <!-- Modal header -->
                    <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                            Information about ISS
                        </h3>
                        <button type="button" @click="$emit('close-modal')"
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

                        <button type="button" @click="$emit('close-modal')"
                            class="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ISSInfo } from '../types/issInformation';

const issInfo = ref<ISSInfo[]>([]);

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

onMounted(() => {
    fetchISSInfo()
});


</script>