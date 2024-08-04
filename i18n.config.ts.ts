export default defineI18nConfig(() => ({
    legacy: false,
    locale: 'de',
    messages: {
      de: {
        welcome: 'Willkommen',
        spacedebris: 'Weltraum Schrott anzeigen',
        imprint: 'Impressum',
        privacy: 'Datenschutz',
        satellites: 'Satelliten anzeigen'
      },
      en: {
        welcome: 'Welcome',
        spacedebris: 'View Space Debris',
        imprint: 'Imprint',
        privacy: 'Privacy',
        satellites: 'Show Satellites'
      }
    }
  }))