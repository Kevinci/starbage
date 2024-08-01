<template>
    <div>
        <footer class="grid grid-cols-2 absolute bottom-0 p-4 z-10 w-full bg-slate-800 bg-opacity-80 ">
            <p class="font-bold font-sans text-left text-gray-50">
            <div class="block py-2 px-3 text-white max-lg:hidden" id="time-log">{{ currentTime }}</div>
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
    </div>
</template>

<script setup lang="ts">
const currentTime = ref(new Date().toString());
</script>