import { defineStore } from 'pinia';

/**
 * Steuert Sicht und Sichtbarkeiten auf dem Globus. Die Navbar setzt hier nur
 * Flags, die eigentliche Umsetzung passiert in pages/index.vue.
 */
export const useGlobeStore = defineStore('globe', {
    state: () => ({
        followISS: false,
        showSatellites: false,
    }),
    actions: {
        toggleFollowISS(value?: boolean) {
            this.followISS = value ?? !this.followISS;
        },
        toggleSatellites(value?: boolean) {
            this.showSatellites = value ?? !this.showSatellites;
        },
    },
});
