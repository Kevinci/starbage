import * as THREE from 'three';
import type { SceneContext } from './context';
import { getSubsolarPoint, type SubsolarPoint } from './sunPosition';

/**
 * Tag- und Nachtseite in Echtzeit: Der Globus bekommt ein eigenes ShaderMaterial, das
 * zwischen Tagtextur und NASA-Nachtlichtern blendet. Die Grenze kommt aus dem echten
 * subsolaren Punkt. Beim Übergang zur Satellitenkarte blendet dieses Material aus.
 */

const dayBrightness = 6.5; // kräftig, Blue Marble ist von sich aus dunkel
const nightBrightness = 1.15; // Stadtlichter etwas anheben
const terminatorSoftness = 0.12; // Breite der Dämmerungszone
const grazingLight = 0.85; // Resthelligkeit direkt an der Tag-Nacht-Grenze
const highlightRolloff = 1.0; // Schulter, damit Wolken und Eis nicht zu Weiß ausbrennen
const dayLift = 0.44; // je kleiner, desto stärker werden Tiefsee und Schatten angehoben
const daySaturation = 0.95; // unter 1 wirkt die Erde matter statt knallig
const deepSeaFloor = 0.008; // Sockel gegen die fast schwarze Tiefsee im Blue-Marble-Bild

// Die Tag-Nacht-Grenze wird im UV-Raum der Textur berechnet, nicht im 3D-Raum.
// Damit ist sie unabhängig davon, wie three-globe die Kugel gedreht hat.
const dayNightVertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const dayNightFragmentShader = `
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform float sunLat;
uniform float sunLng;
uniform float dayBrightness;
uniform float nightBrightness;
uniform float terminatorSoftness;
uniform float grazingLight;
uniform float highlightRolloff;
uniform float dayLift;
uniform float daySaturation;
uniform float deepSeaFloor;
uniform float globeOpacity;

varying vec2 vUv;

const float PI = 3.141592653589793;

// Texturen liegen in sRGB, gerechnet wird linear
vec3 toLinear(vec3 color) {
    return pow(color, vec3(2.2));
}

void main() {
    // Equirektangular: u ist der Längengrad, v der Breitengrad
    float lng = (vUv.x - 0.5) * 2.0 * PI;
    float lat = (vUv.y - 0.5) * PI;

    // Kosinus des Winkels zwischen diesem Punkt und dem subsolaren Punkt
    float cosSunAngle = sin(lat) * sin(sunLat) + cos(lat) * cos(sunLat) * cos(lng - sunLng);

    float daylight = smoothstep(-terminatorSoftness, terminatorSoftness, cosSunAngle);

    // Streifender Einfall an der Grenze bleibt dunkler als der Zenitstand
    float incidence = mix(grazingLight, 1.0, clamp(cosSunAngle, 0.0, 1.0));

    vec3 day = toLinear(texture2D(dayTexture, vUv).rgb);

    // Die Tiefsee ist im Blue-Marble-Bild fast schwarz. Ein kleiner Sockel hebt
    // genau die an, ohne helle Flächen wie Wolken oder Eis anzufassen.
    day = (day + deepSeaFloor) * dayBrightness * incidence;

    // Spitzlichter werden komprimiert statt auf Weiß geclippt - sonst verlieren
    // Wolken und Eis jede Zeichnung.
    day = day / (1.0 + day * highlightRolloff);

    // Der Ozean im Blue-Marble-Bild ist sehr dunkel. Multiplizieren allein hebt ihn
    // kaum, ein Exponent unter 1 zieht Schatten und Mitteltöne deutlich nach oben.
    day = pow(day, vec3(dayLift));

    float dayLuma = dot(day, vec3(0.2126, 0.7152, 0.0722));
    day = mix(vec3(dayLuma), day, daySaturation);

    vec3 night = toLinear(texture2D(nightTexture, vUv).rgb) * nightBrightness;

    gl_FragColor = vec4(mix(night, day, daylight), globeOpacity);
}
`;

export const createDayNight = ({ world, asset }: SceneContext) => {
    let material: THREE.ShaderMaterial | null = null;
    let globeMesh: THREE.Mesh | null = null;

    const setSun = ({ lat, lng }: SubsolarPoint) => {
        if (!material) return;
        material.uniforms.sunLat.value = lat;
        material.uniforms.sunLng.value = lng;
    };

    // Aufruf, sobald globe.gl die Tagtextur geladen hat (onGlobeReady)
    const apply = () => {
        // Die Tagtextur ist über globeImageUrl schon geladen - wiederverwenden statt neu holen
        const currentMaterial = world.globeMaterial() as THREE.MeshPhongMaterial | undefined;
        const dayTexture = currentMaterial?.map;
        if (!dayTexture) return;

        const maxAnisotropy = world.renderer().capabilities.getMaxAnisotropy();

        // Der Shader rechnet die sRGB-Umwandlung selbst, deshalb hier rohe Werte
        dayTexture.anisotropy = maxAnisotropy;
        dayTexture.colorSpace = THREE.NoColorSpace;
        dayTexture.needsUpdate = true;

        const nightTexture = new THREE.TextureLoader().load(asset('earth_night.jpg'), texture => {
            texture.anisotropy = maxAnisotropy;
            texture.colorSpace = THREE.NoColorSpace;
            texture.needsUpdate = true;
        });

        material = new THREE.ShaderMaterial({
            vertexShader: dayNightVertexShader,
            fragmentShader: dayNightFragmentShader,
            uniforms: {
                dayTexture: { value: dayTexture },
                nightTexture: { value: nightTexture },
                sunLat: { value: 0 },
                sunLng: { value: 0 },
                dayBrightness: { value: dayBrightness },
                nightBrightness: { value: nightBrightness },
                terminatorSoftness: { value: terminatorSoftness },
                grazingLight: { value: grazingLight },
                highlightRolloff: { value: highlightRolloff },
                dayLift: { value: dayLift },
                daySaturation: { value: daySaturation },
                deepSeaFloor: { value: deepSeaFloor },
                globeOpacity: { value: 1 } // sinkt beim Übergang zur Satellitenkarte
            }
        });
        setSun(getSubsolarPoint(new Date()));

        world.globeMaterial(material);
        world.scene().traverse(object => {
            if ((object as THREE.Mesh).material === material) globeMesh = object as THREE.Mesh;
        });
    };

    // Übergang zur Satellitenkarte: 0 = eigene Erde, 1 = nur noch Karte.
    // tilesBelow: Kacheln liegen schon unter dem Globus, der dann eine Spur größer sein muss,
    // sonst flackern beide Flächen gegeneinander.
    const setMapBlend = (blend: number, tilesBelow: boolean) => {
        if (!material || !globeMesh) return;

        globeMesh.visible = blend < 1;
        globeMesh.scale.setScalar(tilesBelow ? 1.0005 : 1);
        material.uniforms.globeOpacity.value = 1 - blend;

        const transparent = blend > 0;
        if (material.transparent !== transparent) {
            material.transparent = transparent;
            material.needsUpdate = true;
        }
    };

    return { apply, setSun, setMapBlend };
};
