// https://nuxt.com/docs/api/configuration/nuxt-config

// Auf GitHub Pages liegt die Seite unter /<repo>/ - der Workflow setzt NUXT_APP_BASE_URL.
// Lokal bleibt es '/'.
const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  ssr: false,
  app: {
    baseURL,
    // GitHub Pages (Jekyll) ignoriert Ordner mit führendem Unterstrich -> kein '_nuxt'.
    buildAssetsDir: 'nuxt',
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: `${baseURL}favicon.ico` }]
    }
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  modules: ['@pinia/nuxt', '@nuxtjs/i18n'],
  i18n: {
    vueI18n: './i18n.config.ts', // if you are using custom path, default
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root' // recommended
    }
  }
})
