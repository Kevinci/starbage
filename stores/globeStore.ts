import { defineStore } from 'pinia';

/**
 * Steuert Sicht und Sichtbarkeiten auf dem Globus. Die Navbar setzt hier nur
 * Flags, die eigentliche Umsetzung passiert in pages/index.vue.
 */
export const useGlobeStore = defineStore('globe', {
    state: () => ({
        followISS: false,
        followShip: false,
        steerShip: false,
        showSatellites: false,
        showStarlink: false,
    }),
    getters: {
        // Was die Kamera am Abfangschiff gerade macht
        shipCameraMode: (state): 'off' | 'follow' | 'steer' =>
            state.steerShip ? 'steer' : state.followShip ? 'follow' : 'off',
    },
    actions: {
        // ISS, Mitfliegen und Spielmodus teilen sich die Kamera - immer nur eins davon
        toggleFollowISS(value?: boolean) {
            this.followISS = value ?? !this.followISS;
            if (this.followISS) {
                this.followShip = false;
                this.steerShip = false;
            }
        },
        toggleFollowShip(value?: boolean) {
            this.followShip = value ?? !this.followShip;
            if (this.followShip) {
                this.followISS = false;
                this.steerShip = false;
            }
        },
        toggleSteerShip(value?: boolean) {
            this.steerShip = value ?? !this.steerShip;
            if (this.steerShip) {
                this.followISS = false;
                this.followShip = false;
            }
        },
        toggleSatellites(value?: boolean) {
            this.showSatellites = value ?? !this.showSatellites;
        },
        toggleStarlink(value?: boolean) {
            this.showStarlink = value ?? !this.showStarlink;
        },
    },
});
