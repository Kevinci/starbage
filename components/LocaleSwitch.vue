<template>
    <div class="flex flex-row items-center justify-center select-none">
        <button v-for="code in ['de', 'en']" :key="code" type="button" @click="setLocale(code)" :class="[
            'px-2 py-1 text-sm font-medium transition-colors',
            locale === code ? 'text-white underline' : 'text-gray-400 hover:text-gray-200'
        ]">{{ code.toUpperCase() }}</button>
    </div>
</template>

<script setup lang="ts">
const { setLocale, locale } = useI18n();
</script>
