import { defineStore } from 'pinia';

/**
 * Steuert Sicht und Sichtbarkeiten auf dem Globus. Die Navbar setzt hier nur
 * Flags, die eigentliche Umsetzung passiert in pages/index.vue.
 */
export const useGlobeStore = defineStore('globe', {
    state: () => ({
        followISS: false,
        followShip: false,
        showSatellites: false,
        showStarlink: false,
    }),
    actions: {
        // ISS und Abfangschiff teilen sich die Kamera - immer nur einem folgen
        toggleFollowISS(value?: boolean) {
            this.followISS = value ?? !this.followISS;
            if (this.followISS) this.followShip = false;
        },
        toggleFollowShip(value?: boolean) {
            this.followShip = value ?? !this.followShip;
            if (this.followShip) this.followISS = false;
        },
        toggleSatellites(value?: boolean) {
            this.showSatellites = value ?? !this.showSatellites;
        },
        toggleStarlink(value?: boolean) {
            this.showStarlink = value ?? !this.showStarlink;
        },
    },
});
