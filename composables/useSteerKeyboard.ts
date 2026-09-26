import { onMounted, onUnmounted, ref, watch } from 'vue';

/**
 * Tastatursteuerung für den Spielmodus des Abfangschiffs: WASD oder Pfeiltasten lenken,
 * Esc beendet. Blendet beim Start kurz einen Hinweis zur Steuerung ein.
 */

const steerKeys = {
    left: ['a', 'arrowleft'],
    right: ['d', 'arrowright'],
    up: ['w', 'arrowup'],
    down: ['s', 'arrowdown']
};
const allSteerKeys = Object.values(steerKeys).flat();
const hintDurationMs = 6000;

interface SteerKeyboardOptions {
    isSteering: () => boolean;
    stopSteering: () => void;
    steer: (x: number, y: number) => void; // x: +1 rechts, y: +1 hoch (Bildschirm)
}

export const useSteerKeyboard = ({ isSteering, stopSteering, steer }: SteerKeyboardOptions) => {
    const pressedKeys = new Set<string>();
    const showSteerHint = ref(false);
    let hintTimer: ReturnType<typeof setTimeout> | undefined;

    const updateInput = () => {
        const held = (keys: string[]) => (keys.some(key => pressedKeys.has(key)) ? 1 : 0);
        steer(held(steerKeys.right) - held(steerKeys.left), held(steerKeys.up) - held(steerKeys.down));
    };

    const releaseKeys = () => {
        pressedKeys.clear();
        updateInput();
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (!isSteering()) return;
        const key = event.key.toLowerCase();
        if (key === 'escape') {
            stopSteering();
            return;
        }
        if (!allSteerKeys.includes(key)) return;
        event.preventDefault(); // Pfeiltasten sollen nicht scrollen
        pressedKeys.add(key);
        updateInput();
    };

    const onKeyUp = (event: KeyboardEvent) => {
        if (!pressedKeys.delete(event.key.toLowerCase())) return;
        updateInput();
    };

    // Hinweis zur Steuerung kurz einblenden, sobald der Spielmodus startet
    watch(isSteering, steering => {
        clearTimeout(hintTimer);
        showSteerHint.value = steering;
        if (steering) hintTimer = setTimeout(() => { showSteerHint.value = false; }, hintDurationMs);
        else releaseKeys();
    });

    onMounted(() => {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', releaseKeys); // sonst "klemmt" eine Taste nach Fensterwechsel
    });

    onUnmounted(() => {
        clearTimeout(hintTimer);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', releaseKeys);
    });

    return { showSteerHint };
};
