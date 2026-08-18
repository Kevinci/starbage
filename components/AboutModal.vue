<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        @click.self="$emit('close-modal')">
        <div
            class="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            <header
                class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-700 bg-slate-900/95 px-6 py-5 backdrop-blur">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-amber-400">Disclaimer</p>
                    <h3 class="mt-1 text-2xl font-bold text-white">{{ $t('about.title') }}</h3>
                    <p class="mt-1 text-sm text-slate-400">{{ $t('about.subtitle') }}</p>
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

            <div class="space-y-8 px-6 py-6">

                <section class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                    <h4 class="text-lg font-semibold text-amber-400">{{ $t('about.fictionTitle') }}</h4>
                    <p class="mt-3 leading-relaxed text-slate-300">{{ $t('about.fictionText') }}</p>
                </section>

                <section>
                    <h4 class="border-l-2 border-fuchsia-500 pl-3 text-lg font-semibold text-white">
                        {{ $t('about.purposeTitle') }}</h4>
                    <p class="mt-3 leading-relaxed text-slate-300">{{ $t('about.purposeText') }}</p>
                </section>

                <section>
                    <h4 class="border-l-2 border-fuchsia-500 pl-3 text-lg font-semibold text-white">
                        {{ $t('about.dataTitle') }}</h4>
                    <dl class="mt-4 space-y-3">
                        <div v-for="row in dataRows" :key="row.label"
                            class="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                            <dt class="text-xs font-semibold uppercase tracking-wider" :class="row.tone">
                                {{ row.label }}</dt>
                            <dd class="mt-1 text-sm leading-relaxed text-slate-300">{{ row.text }}</dd>
                        </div>
                    </dl>
                </section>

            </div>

            <footer class="flex items-center justify-end border-t border-slate-700 px-6 py-4">
                <button type="button" @click="$emit('close-modal')"
                    class="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white">
                    {{ $t('close') }}</button>
            </footer>
        </div>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ 'close-modal': [] }>();
const { t } = useI18n();

const dataRows = computed(() => [
    { label: t('about.dataRealLabel'), text: t('about.dataRealText'), tone: 'text-emerald-400' },
    { label: t('about.dataFakeLabel'), text: t('about.dataFakeText'), tone: 'text-fuchsia-400' },
    { label: t('about.dataScaleLabel'), text: t('about.dataScaleText'), tone: 'text-sky-400' },
]);

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') emit('close-modal');
};

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>
