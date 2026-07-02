/**
 * Formatiert Sekunden in MM:SS Format
 * @param seconds - Die zu formatierenden Sekunden
 * @returns Formatierter String im MM:SS Format
 */
export declare function formatTime(seconds: number): string;
/**
 * Parst einen MM:SS String zu Sekunden
 * @param timeString - String im MM:SS Format
 * @returns Sekunden als Zahl oder null bei ungültigem Format
 */
export declare function parseTime(timeString: string): number | null;
/**
 * Überprüft, ob ein Zeitbereich gültig ist
 * @param startTime - Startzeit in Sekunden
 * @param endTime - Endzeit in Sekunden
 * @returns true wenn der Zeitbereich gültig ist
 */
export declare function isValidTimeRange(startTime: number, endTime: number): boolean;
/**
 * Berechnet die Dauer zwischen zwei Zeitpunkten
 * @param startTime - Startzeit in Sekunden
 * @param endTime - Endzeit in Sekunden
 * @returns Dauer in Sekunden oder 0 bei ungültigem Bereich
 */
export declare function calculateDuration(startTime: number, endTime: number): number;
/**
 * Formatiert eine Dauer in Sekunden zu einem lesbaren String
 * @param seconds - Dauer in Sekunden
 * @returns Formatierter String (z.B. "1h 30m 45s" oder "2m 15s")
 */
export declare function formatDuration(seconds: number): string;
/**
 * Konvertiert Sekunden zu Frames basierend auf FPS
 * @param seconds - Zeit in Sekunden
 * @param fps - Frames per Second (Standard: 50)
 * @returns Frame-Nummer
 */
export declare function secondsToFrames(seconds: number, fps?: number): number;
/**
 * Konvertiert Frames zu Sekunden basierend auf FPS
 * @param frames - Frame-Nummer
 * @param fps - Frames per Second (Standard: 50)
 * @returns Zeit in Sekunden
 */
export declare function framesToSeconds(frames: number, fps?: number): number;
/**
 * Rundet Zeit auf die nächste Dezimalstelle
 * @param seconds - Zeit in Sekunden
 * @param decimals - Anzahl Dezimalstellen (Standard: 1)
 * @returns Gerundete Zeit
 */
export declare function roundTime(seconds: number, decimals?: number): number;
/**
 * Überprüft, ob sich zwei Zeitbereiche überschneiden
 * @param start1 - Start des ersten Bereichs
 * @param end1 - Ende des ersten Bereichs
 * @param start2 - Start des zweiten Bereichs
 * @param end2 - Ende des zweiten Bereichs
 * @returns true wenn sich die Bereiche überschneiden
 */
export declare function timeRangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean;
/**
 * Normalisiert eine Zeit auf einen gültigen Bereich
 * @param time - Zeit in Sekunden
 * @param minTime - Minimale erlaubte Zeit (Standard: 0)
 * @param maxTime - Maximale erlaubte Zeit
 * @returns Normalisierte Zeit
 */
export declare function clampTime(time: number, minTime?: number, maxTime?: number): number;
