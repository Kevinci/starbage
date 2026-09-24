import * as THREE from 'three';

/**
 * Oberflächen für das Abfangschiff und den Schrott, zur Laufzeit auf Canvas
 * gezeichnet - keine Bilddateien nötig. Jede Oberfläche liefert Farbe, Relief
 * (bump, hell = erhaben) und Rauheit (hell = matt) passend übereinander.
 */

export interface Surface {
    map: THREE.Texture;
    bumpMap: THREE.Texture;
    roughnessMap: THREE.Texture;
}

export type Layers = { color: CanvasRenderingContext2D; bump: CanvasRenderingContext2D; rough: CanvasRenderingContext2D };

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const gray = (value: number, alpha = 1) => `rgba(${value}, ${value}, ${value}, ${alpha})`;
const rgb = ([r, g, b]: number[], shift = 0, alpha = 1) =>
    `rgba(${Math.round(r + shift)}, ${Math.round(g + shift)}, ${Math.round(b + shift)}, ${alpha})`;

export const createSurface = (size: number, paint: (layers: Layers, size: number) => void): Surface => {
    const canvases = [0, 1, 2].map(() => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
    });
    const [color, bump, rough] = canvases.map(canvas => canvas.getContext('2d')!);
    paint({ color, bump, rough }, size);

    const [map, bumpMap, roughnessMap] = canvases.map(canvas => {
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 8;
        return texture;
    });
    map.colorSpace = THREE.SRGBColorSpace;

    return { map, bumpMap, roughnessMap };
};

// Gleiche Bilder, anderer Maßstab - für Bauteile mit anderem Seitenverhältnis
export const withRepeat = (surface: Surface, x: number, y: number): Surface => {
    const scaled = (texture: THREE.Texture) => {
        const copy = texture.clone();
        copy.repeat.set(x, y);
        return copy;
    };
    return { map: scaled(surface.map), bumpMap: scaled(surface.bumpMap), roughnessMap: scaled(surface.roughnessMap) };
};

export const fillAll = ({ color, bump, rough }: Layers, size: number, base: string, bumpValue: number, roughValue: number) => {
    color.fillStyle = base;
    color.fillRect(0, 0, size, size);
    bump.fillStyle = gray(bumpValue);
    bump.fillRect(0, 0, size, size);
    rough.fillStyle = gray(roughValue);
    rough.fillRect(0, 0, size, size);
};

// Ruß- und Schmutzflecken, dort auch matter
const grime = ({ color, rough }: Layers, size: number, count: number, tint: number[], maxAlpha: number) => {
    for (let i = 0; i < count; i++) {
        const x = rand(0, size);
        const y = rand(0, size);
        const radius = rand(size * 0.02, size * 0.12);
        const alpha = rand(maxAlpha * 0.3, maxAlpha);

        const stain = color.createRadialGradient(x, y, 0, x, y, radius);
        stain.addColorStop(0, rgb(tint, 0, alpha));
        stain.addColorStop(1, rgb(tint, 0, 0));
        color.fillStyle = stain;
        color.fillRect(x - radius, y - radius, radius * 2, radius * 2);

        const matte = rough.createRadialGradient(x, y, 0, x, y, radius);
        matte.addColorStop(0, gray(230, alpha));
        matte.addColorStop(1, gray(230, 0));
        rough.fillStyle = matte;
        rough.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
};

// Feine Kratzer: hell in der Farbe, leicht vertieft im Relief
const scratches = ({ color, bump }: Layers, size: number, count: number, alpha: number) => {
    for (let i = 0; i < count; i++) {
        const x = rand(0, size);
        const y = rand(0, size);
        const angle = rand(0, Math.PI * 2);
        const length = rand(size * 0.02, size * 0.1);
        const x2 = x + Math.cos(angle) * length;
        const y2 = y + Math.sin(angle) * length;

        color.strokeStyle = gray(235, rand(alpha * 0.4, alpha));
        color.lineWidth = rand(0.6, 1.4);
        color.beginPath();
        color.moveTo(x, y);
        color.lineTo(x2, y2);
        color.stroke();

        bump.strokeStyle = gray(100, 0.6);
        bump.lineWidth = 1;
        bump.beginPath();
        bump.moveTo(x, y);
        bump.lineTo(x2, y2);
        bump.stroke();
    }
};

const rivet = ({ color, bump }: Layers, x: number, y: number, radius: number) => {
    color.fillStyle = gray(150, 0.9);
    color.beginPath();
    color.arc(x, y, radius, 0, Math.PI * 2);
    color.fill();
    bump.fillStyle = gray(220);
    bump.beginPath();
    bump.arc(x, y, radius * 1.1, 0, Math.PI * 2);
    bump.fill();
};

const hazardStripes = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    context.fillStyle = '#1f2937';
    context.fillRect(x, y, width, height);
    context.fillStyle = '#E47F00';
    for (let offset = -height; offset < width; offset += height * 0.9) {
        context.beginPath();
        context.moveTo(x + offset, y + height);
        context.lineTo(x + offset + height * 0.45, y + height);
        context.lineTo(x + offset + height * 0.9, y);
        context.lineTo(x + offset + height * 0.45, y);
        context.fill();
    }
    context.restore();
};

interface HullOptions {
    base: number[];
    grimeAmount: number;
    stripes: boolean;
    label?: string;
}

// Beplankung aus Blechplatten mit Fugen, Nietreihen, Wartungsklappen und Gebrauchsspuren
const paintHull = (options: HullOptions) => (layers: Layers, size: number) => {
    const { color, bump, rough } = layers;
    fillAll(layers, size, rgb(options.base), 128, 110);

    const columns = 8;
    const rows = 6;
    const cellWidth = size / columns;
    const cellHeight = size / rows;

    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const x = column * cellWidth;
            const y = row * cellHeight;

            color.fillStyle = rgb(options.base, rand(-9, 7));
            color.fillRect(x, y, cellWidth, cellHeight);
            rough.fillStyle = gray(rand(95, 135));
            rough.fillRect(x, y, cellWidth, cellHeight);

            if (options.stripes && Math.random() < 0.08) {
                hazardStripes(color, x + 4, y + cellHeight * 0.72, cellWidth - 8, cellHeight * 0.18);
            }

            // Wartungsklappe mit vier Schrauben
            if (Math.random() < 0.2) {
                const inset = cellWidth * 0.22;
                const hatchX = x + inset;
                const hatchY = y + cellHeight * 0.22;
                const hatchWidth = cellWidth - inset * 2;
                const hatchHeight = cellHeight * 0.45;
                color.strokeStyle = rgb(options.base, -70, 0.7);
                color.lineWidth = 2;
                color.strokeRect(hatchX, hatchY, hatchWidth, hatchHeight);
                bump.strokeStyle = gray(80);
                bump.lineWidth = 3;
                bump.strokeRect(hatchX, hatchY, hatchWidth, hatchHeight);
                [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([u, v]) => {
                    rivet(layers, hatchX + 6 + u * (hatchWidth - 12), hatchY + 6 + v * (hatchHeight - 12), 2.4);
                });
            }

            // Fugen zwischen den Platten
            color.strokeStyle = rgb(options.base, -95, 0.6);
            color.lineWidth = 2.5;
            color.strokeRect(x, y, cellWidth, cellHeight);
            bump.strokeStyle = gray(45);
            bump.lineWidth = 4;
            bump.strokeRect(x, y, cellWidth, cellHeight);

            // Nietreihen entlang der Oberkante und der linken Kante
            for (let offset = 10; offset < cellWidth - 4; offset += 15) rivet(layers, x + offset, y + 7, 1.8);
            for (let offset = 22; offset < cellHeight - 4; offset += 15) rivet(layers, x + 7, y + offset, 1.8);
        }
    }

    if (options.label) {
        color.save();
        color.fillStyle = rgb(options.base, -150, 0.85);
        color.font = `bold ${Math.round(cellHeight * 0.32)}px sans-serif`;
        color.textBaseline = 'middle';
        color.fillText(options.label, cellWidth * 2.2, cellHeight * 3.5);
        color.font = `bold ${Math.round(cellHeight * 0.18)}px sans-serif`;
        color.fillText('SC-01  DEBRIS INTERCEPTOR', cellWidth * 2.2, cellHeight * 3.85);
        color.restore();
    }

    // Laufspuren von oben nach unten, Schmutz, Kratzer
    for (let i = 0; i < 50 * options.grimeAmount; i++) {
        const x = rand(0, size);
        const y = rand(0, size);
        const streak = color.createLinearGradient(x, y, x, y + rand(30, 120));
        streak.addColorStop(0, rgb([70, 60, 50], 0, 0.12));
        streak.addColorStop(1, rgb([70, 60, 50], 0, 0));
        color.fillStyle = streak;
        color.fillRect(x, y, rand(2, 6), 120);
    }
    grime(layers, size, Math.round(40 * options.grimeAmount), [60, 52, 45], 0.18);
    scratches(layers, size, Math.round(80 * options.grimeAmount), 0.35);
};

// Gebürstetes dunkles Metall für Träger, Streben und Ringe
const paintDarkMetal = (layers: Layers, size: number) => {
    const { color, bump, rough } = layers;
    fillAll(layers, size, '#3b4452', 128, 120);

    for (let i = 0; i < 1400; i++) {
        const y = rand(0, size);
        color.fillStyle = Math.random() < 0.5 ? gray(255, rand(0.02, 0.06)) : gray(0, rand(0.03, 0.08));
        color.fillRect(0, y, size, rand(0.5, 1.5));
        rough.fillStyle = gray(rand(80, 170), 0.25);
        rough.fillRect(0, y, size, 1);
    }
    for (let y = size / 4; y < size; y += size / 4) {
        bump.fillStyle = gray(60);
        bump.fillRect(0, y - 2, size, 4);
        color.fillStyle = gray(20, 0.5);
        color.fillRect(0, y - 1, size, 2);
    }
    scratches(layers, size, 60, 0.25);
};

// Goldene Isolierfolie: zerknittert, glänzend, mit Klebenähten
const paintFoil = (layers: Layers, size: number) => {
    const { color, bump, rough } = layers;
    fillAll(layers, size, '#a8790f', 128, 60);

    for (let i = 0; i < 1100; i++) {
        const x = rand(0, size);
        const y = rand(0, size);
        const radius = rand(10, 42);
        const points = [0, 1, 2].map(() => [x + rand(-radius, radius), y + rand(-radius, radius)]);
        const light = rand(0, 1);

        const facet = (context: CanvasRenderingContext2D, style: string) => {
            context.fillStyle = style;
            context.beginPath();
            context.moveTo(points[0][0], points[0][1]);
            context.lineTo(points[1][0], points[1][1]);
            context.lineTo(points[2][0], points[2][1]);
            context.fill();
        };
        facet(color, `hsla(${rand(38, 48)}, ${rand(65, 90)}%, ${25 + light * 45}%, 0.55)`);
        facet(bump, gray(70 + light * 120, 0.6));
        facet(rough, gray(rand(30, 90), 0.6));
    }

    // Helle Knickkanten
    for (let i = 0; i < 260; i++) {
        const x = rand(0, size);
        const y = rand(0, size);
        color.strokeStyle = `hsla(48, 100%, ${rand(70, 88)}%, ${rand(0.25, 0.6)})`;
        color.lineWidth = rand(0.6, 1.6);
        color.beginPath();
        color.moveTo(x, y);
        color.lineTo(x + rand(-30, 30), y + rand(-30, 30));
        color.stroke();
    }

    // Klebebänder an den Bahnen
    [0.24, 0.62].forEach(v => {
        color.fillStyle = 'rgba(210, 190, 120, 0.85)';
        color.fillRect(0, v * size, size, 12);
        bump.fillStyle = gray(150);
        bump.fillRect(0, v * size, size, 12);
        rough.fillStyle = gray(150);
        rough.fillRect(0, v * size, size, 12);
    });
};

// Lackierte Tanks: Schweißnähte, Beschriftung, Abrieb an den Enden
const paintTank = (layers: Layers, size: number) => {
    const { color, bump, rough } = layers;
    const base = [214, 118, 10];
    fillAll(layers, size, rgb(base), 128, 105);

    for (let i = 0; i < 40; i++) {
        color.fillStyle = rgb(base, rand(-18, 12), 0.25);
        color.fillRect(0, rand(0, size), size, rand(4, 30));
    }

    // Umlaufende Schweißnähte als erhabene Raupen
    [0.12, 0.38, 0.62, 0.88].forEach(v => {
        const y = v * size;
        color.fillStyle = rgb(base, -55, 0.8);
        color.fillRect(0, y - 3, size, 6);
        bump.fillStyle = gray(200);
        bump.fillRect(0, y - 3, size, 6);
        for (let x = 0; x < size; x += 5) {
            bump.fillStyle = gray(235);
            bump.beginPath();
            bump.arc(x, y, 2, 0, Math.PI * 2);
            bump.fill();
        }
    });
    color.fillStyle = rgb(base, -45, 0.7);
    color.fillRect(size * 0.5 - 2, 0, 4, size);
    bump.fillStyle = gray(190);
    bump.fillRect(size * 0.5 - 2, 0, 4, size);

    // Beschriftung längs zum Tank
    color.save();
    color.translate(size * 0.26, size * 0.5);
    color.rotate(-Math.PI / 2);
    color.fillStyle = 'rgba(255, 255, 255, 0.85)';
    color.font = `bold ${Math.round(size * 0.07)}px sans-serif`;
    color.textAlign = 'center';
    color.fillText('PROP  N2O4', 0, 0);
    color.font = `${Math.round(size * 0.035)}px sans-serif`;
    color.fillText('MAX 22 BAR  ·  NO STEP', 0, size * 0.06);
    color.restore();

    grime(layers, size, 25, [70, 40, 20], 0.22);
    scratches(layers, size, 70, 0.4);
};

// Radiatoren: helle Lamellen mit Rahmen
const paintRadiator = (layers: Layers, size: number) => {
    const { color, bump, rough } = layers;
    fillAll(layers, size, '#e9edf1', 128, 90);

    for (let x = 0; x < size; x += 16) {
        color.fillStyle = gray(200, 0.8);
        color.fillRect(x, 0, 3, size);
        bump.fillStyle = gray(190);
        bump.fillRect(x, 0, 8, size);
        bump.fillStyle = gray(80);
        bump.fillRect(x + 8, 0, 3, size);
        rough.fillStyle = gray(60);
        rough.fillRect(x, 0, 8, size);
    }
    for (let y = size / 6; y < size; y += size / 6) {
        color.fillStyle = gray(150);
        color.fillRect(0, y - 3, size, 6);
        bump.fillStyle = gray(200);
        bump.fillRect(0, y - 3, size, 6);
    }
    color.strokeStyle = gray(120);
    color.lineWidth = 12;
    color.strokeRect(0, 0, size, size);
    grime(layers, size, 18, [90, 80, 60], 0.12);
};

// Düsen: Hitzeverfärbung von dunkel über violett zu bronze, Kühlkanäle
const paintNozzle = (layers: Layers, size: number) => {
    const { color, bump, rough } = layers;
    fillAll(layers, size, '#2b2f36', 128, 100);

    const heat = color.createLinearGradient(0, 0, 0, size);
    heat.addColorStop(0, '#262a31');
    heat.addColorStop(0.35, '#3d3550');
    heat.addColorStop(0.6, '#5a3f5e');
    heat.addColorStop(0.82, '#8a5a2b');
    heat.addColorStop(1, '#c79a52');
    color.fillStyle = heat;
    color.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 14) {
        color.fillStyle = gray(0, 0.25);
        color.fillRect(0, y, size, 3);
        bump.fillStyle = gray(190);
        bump.fillRect(0, y + 3, size, 8);
    }
    for (let x = 0; x < size; x += 24) {
        bump.fillStyle = gray(90);
        bump.fillRect(x, 0, 2, size);
    }
    grime(layers, size, 40, [10, 10, 12], 0.35);
};

// Verbrannter, zerkratzter Schrott mit Rostflecken
const paintScorched = (layers: Layers, size: number) => {
    const { color, bump, rough } = layers;
    fillAll(layers, size, '#8b8f94', 128, 170);

    for (let i = 0; i < 4; i++) {
        const position = (i + 0.5) * size / 4 + rand(-20, 20);
        color.fillStyle = gray(60, 0.5);
        color.fillRect(position, 0, 3, size);
        bump.fillStyle = gray(60);
        bump.fillRect(position, 0, 4, size);
    }
    grime(layers, size, 70, [15, 12, 10], 0.55);
    grime(layers, size, 25, [120, 60, 25], 0.35);

    // Dellen im Relief
    for (let i = 0; i < 30; i++) {
        const x = rand(0, size);
        const y = rand(0, size);
        const radius = rand(8, 30);
        const dent = bump.createRadialGradient(x, y, 0, x, y, radius);
        dent.addColorStop(0, gray(50, 0.8));
        dent.addColorStop(1, gray(128, 0));
        bump.fillStyle = dent;
        bump.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    scratches(layers, size, 220, 0.55);
    rough.fillStyle = gray(200, 0.3);
    rough.fillRect(0, 0, size, size);
};

export const createCollectorSurfaces = () => ({
    hull: createSurface(1024, paintHull({ base: [222, 226, 232], grimeAmount: 1, stripes: true, label: 'STARBAGE' })),
    wornHull: createSurface(512, paintHull({ base: [200, 203, 207], grimeAmount: 3, stripes: false })),
    darkMetal: createSurface(512, paintDarkMetal),
    foil: createSurface(512, paintFoil),
    tank: createSurface(512, paintTank),
    radiator: createSurface(512, paintRadiator),
    nozzle: createSurface(256, paintNozzle),
    scorched: createSurface(512, paintScorched)
});

export type CollectorSurfaces = ReturnType<typeof createCollectorSurfaces>;
