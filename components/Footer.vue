<template>
    <div>
        <footer
            class="fixed bottom-0 z-10 w-full bg-slate-800 bg-opacity-80 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div class="px-3 text-white max-lg:hidden" id="time-log">{{ currentTime }}</div>

            <p class="text-xs text-gray-400 max-sm:w-full">
                <button type="button" @click="modalStore.toggleAboutModal(true)"
                    class="font-medium text-amber-400 underline hover:text-amber-300">
                    {{ $t('aboutFooter') }}</button>
                <span class="mx-2 text-gray-600 max-sm:hidden">|</span>
                <span class="max-sm:block">
                    {{ $t('datasource') }}
                    <a class="underline hover:text-gray-200" href="https://wheretheiss.at/" target="_blank"
                        rel="noopener">wheretheiss.at</a>,
                    <a class="underline hover:text-gray-200" href="https://thespacedevs.com/" target="_blank"
                        rel="noopener">The Space Devs</a>
                </span>
            </p>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { useModalStore } from '~/stores/modalStore';

const modalStore = useModalStore();
const currentTime = ref(new Date().toString());
let ticker: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
    ticker = setInterval(() => {
        currentTime.value = new Date().toString();
    }, 1000);
});

onUnmounted(() => {
    if (ticker) clearInterval(ticker);
});
</script>
