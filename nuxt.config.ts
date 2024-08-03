// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  ssr: false,
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  modules: ['@pinia/nuxt', "@nuxtjs/i18n", "nuxt-security"],
  security: {
    headers: {
      crossOriginResourcePolicy: 'cross-origin',
      xFrameOptions: false,
      contentSecurityPolicy: {
        'geolocation': ['self'] || false,
      }
    },
    allowedMethodsRestricter: {
      methods: ['GET']
    }
  },
  i18n: {
    vueI18n: './i18n.config.ts', // if you are using custom path, default
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root' // recommended
    }
  }
})