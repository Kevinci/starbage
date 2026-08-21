<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        @click.self="$emit('close-modal')">
        <div
            class="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            <!-- Kopf: bleibt beim Scrollen stehen -->
            <header
                class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-700 bg-slate-900/95 px-6 py-5 backdrop-blur">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-fuchsia-400">Starbage</p>
                    <h3 class="mt-1 text-2xl font-bold text-white">{{ $t('debris.title') }}</h3>
                    <p class="mt-1 text-sm text-slate-400">{{ $t('debris.subtitle') }}</p>
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

                <section>
                    <h4 class="border-l-2 border-fuchsia-500 pl-3 text-lg font-semibold text-white">
                        {{ $t('debris.whatTitle') }}</h4>
                    <p class="mt-3 leading-relaxed text-slate-300">{{ $t('debris.whatText') }}</p>
                </section>

                <section>
                    <h4 class="border-l-2 border-fuchsia-500 pl-3 text-lg font-semibold text-white">
                        {{ $t('debris.numbersTitle') }}</h4>
                    <dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div v-for="(stat, index) in stats" :key="index"
                            class="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                            <dt class="text-2xl font-bold text-fuchsia-400">{{ stat.value }}</dt>
                            <dd class="mt-1 text-xs leading-snug text-slate-400">{{ stat.label }}</dd>
                        </div>
                    </dl>
                    <p class="mt-3 text-xs text-slate-500">{{ $t('debris.numbersHint') }}</p>
                </section>

                <section class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                    <h4 class="text-lg font-semibold text-amber-400">{{ $t('debris.dangerTitle') }}</h4>
                    <p class="mt-3 leading-relaxed text-slate-300">{{ $t('debris.dangerText') }}</p>
                </section>

                <section>
                    <h4 class="border-l-2 border-fuchsia-500 pl-3 text-lg font-semibold text-white">
                        {{ $t('debris.whereTitle') }}</h4>
                    <p class="mt-3 leading-relaxed text-slate-300">{{ $t('debris.whereText') }}</p>
                </section>

                <section>
                    <h4 class="border-l-2 border-fuchsia-500 pl-3 text-lg font-semibold text-white">
                        {{ $t('debris.actionTitle') }}</h4>
                    <p class="mt-3 leading-relaxed text-slate-300">{{ $t('debris.actionText') }}</p>
                </section>

            </div>

            <footer
                class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 px-6 py-4 text-xs text-slate-500">
                <p>
                    {{ $t('debris.source') }}
                    <a class="underline hover:text-slate-300"
                        href="https://www.esa.int/Space_Safety/Space_Debris/Space_debris_by_the_numbers" target="_blank"
                        rel="noopener">{{ $t('debris.sourceLink') }}</a>
                </p>
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

const stats = computed(() => [
    { value: t('debris.statTrackedValue'), label: t('debris.statTrackedLabel') },
    { value: t('debris.statBigValue'), label: t('debris.statBigLabel') },
    { value: t('debris.statMidValue'), label: t('debris.statMidLabel') },
    { value: t('debris.statSmallValue'), label: t('debris.statSmallLabel') },
    { value: t('debris.statMassValue'), label: t('debris.statMassLabel') },
    { value: t('debris.statEventsValue'), label: t('debris.statEventsLabel') },
]);

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') emit('close-modal');
};

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>
