import type { GlobeInstance } from 'globe.gl';

/**
 * Was jedes Szenen-Modul braucht: die globe.gl-Instanz, Pfade zu public/ und ein
 * Signal, wann die Seite verlassen wurde und alle Animationsschleifen enden sollen.
 */
export interface SceneContext {
    world: GlobeInstance;
    asset: (path: string) => string;
    isRunning: () => boolean;
}

export const EARTH_RADIUS_KM = 6371;
