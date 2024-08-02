<template>
    <div>
        <footer class="grid grid-cols-2 fixed bottom-0 p-4 z-10 w-full bg-slate-800 bg-opacity-80 flex justify-between">
            <div class="block px-3 text-white max-lg:hidden" id="time-log">{{ currentTime }}</div>
            <ul class="ffont-bold font-sans text-right text-gray-50 justify-end flex">
                <li class="mr-2">
                    <NuxtLink to="/imprint">{{ $t('imprint') }}</NuxtLink>
                </li>
                <li>
                    <NuxtLink to="/privacy">{{ $t('privacy') }}</NuxtLink>
                </li>
            </ul>
        </footer>
    </div>
</template>

<script setup lang="ts">
const currentTime = ref(new Date().toString());
</script>