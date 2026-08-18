<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        @click.self="$emit('close-modal')">
        <div
            class="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            <header
                class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-700 bg-slate-900/95 px-6 py-5 backdrop-blur">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-emerald-400">Live</p>
                    <h3 class="mt-1 text-2xl font-bold text-white">{{ $t('crew.title') }}</h3>
                    <p class="mt-1 text-sm text-slate-400">{{ $t('crew.subtitle') }}</p>
                </div>
                <button type="button" @click="$emit('close-modal')" :aria-label="$t('close')"
                    class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                    <svg class="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 14 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                    </svg>
                </button>
            </header>

            <div class="px-6 py-6">
                <div class="flex items-baseline justify-between gap-4">
                    <h4 class="border-l-2 border-emerald-500 pl-3 text-lg font-semibold text-white">
                        {{ $t('crew.listTitle') }}</h4>
                    <p v-if="crew.length" class="text-sm text-slate-400">
                        <span class="text-2xl font-bold text-emerald-400">{{ crew.length }}</span>
                        {{ $t('crew.count') }}
                    </p>
                </div>

                <p v-if="isLoading" class="mt-4 text-sm text-slate-400">{{ $t('crew.loading') }}</p>
                <p v-else-if="!crew.length" class="mt-4 text-sm text-slate-400">{{ $t('crew.empty') }}</p>

                <ul v-else class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <li v-for="person in crew" :key="person.name"
                        class="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                        <span class="text-sm font-medium text-slate-100">{{ person.name }}</span>
                        <span v-if="person.craft"
                            class="shrink-0 rounded-md bg-slate-700/70 px-2 py-0.5 text-xs font-medium text-slate-300">
                            {{ person.craft }}</span>
                    </li>
                </ul>
            </div>

            <footer
                class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 px-6 py-4 text-xs text-slate-500">
                <p class="max-w-md">{{ $t('crew.source') }}</p>
                <button type="button" @click="$emit('close-modal')"
                    class="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white">
                    {{ $t('close') }}</button>
            </footer>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ISSInfo } from '../types/issInformation';

const emit = defineEmits<{ 'close-modal': [] }>();

const crew = ref<ISSInfo[]>([]);
const isLoading = ref(true);

// open-notify.org bietet kein HTTPS an - über HTTPS (GitHub Pages) wäre der Request
// Mixed Content und würde blockiert. Daher The Space Devs als Quelle.
const CREW_API = 'https://ll.thespacedevs.com/2.2.0/astronaut/?in_space=true&limit=100';

const fetchCrew = () => {
    fetch(CREW_API)
        .then(response => response.json())
        .then(data => {
            crew.value = (data.results ?? [])
                // 'Starman' im Tesla ist in der Datenbank als im All markiert - kein Mensch
                .filter((entry: any) => entry.type?.name !== 'Non-Human')
                .map((entry: any) => ({
                    name: entry.name,
                    craft: entry.agency?.abbrev ?? entry.nationality ?? ''
                }));
        })
        .catch(error => {
            console.error('Fehler beim Abrufen der Besatzungsdaten:', error);
        })
        .finally(() => {
            isLoading.value = false;
        });
};

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') emit('close-modal');
};

onMounted(() => {
    fetchCrew();
    window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>
