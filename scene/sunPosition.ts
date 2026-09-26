import * as THREE from 'three';

export interface SubsolarPoint {
    lat: number; // Radiant
    lng: number; // Radiant, -PI..PI
}

// Subsolarer Punkt: Position, an der die Sonne senkrecht über der Erde steht.
// Niedrig aufgelöstes Standardverfahren, Genauigkeit rund 0,01 Grad.
export const getSubsolarPoint = (date: Date): SubsolarPoint => {
    const julianDays = date.getTime() / 86400000 + 2440587.5 - 2451545.0;

    const meanLongitude = 280.460 + 0.9856474 * julianDays;
    const meanAnomaly = THREE.MathUtils.degToRad(357.528 + 0.9856003 * julianDays);

    const eclipticLongitude = THREE.MathUtils.degToRad(
        meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly)
    );
    const obliquity = THREE.MathUtils.degToRad(23.439 - 0.0000004 * julianDays);

    const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
    const rightAscension = Math.atan2(
        Math.cos(obliquity) * Math.sin(eclipticLongitude),
        Math.cos(eclipticLongitude)
    );

    // Greenwich-Sternzeit bestimmt, welcher Längengrad gerade der Sonne zugewandt ist
    const gmst = THREE.MathUtils.degToRad(((18.697374558 + 24.06570982441908 * julianDays) % 24) * 15);
    const hourAngle = rightAscension - gmst;

    return {
        lat: declination,
        lng: Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle)) // auf -PI..PI normieren
    };
};
