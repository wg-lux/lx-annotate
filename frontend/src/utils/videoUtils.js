// src/utils/videoHelpers.ts
export const translationMap = {
    appendix: 'Appendix',
    blood: 'Blut',
    diverticule: 'Divertikel',
    grasper: 'Greifer',
    ileocaecalvalve: 'Ileozäkalklappe',
    ileum: 'Ileum',
    low_quality: 'Niedrige Bildqualität',
    nbi: 'Narrow Band Imaging',
    needle: 'Nadel',
    outside: 'Außerhalb',
    polyp: 'Polyp',
    snare: 'Snare',
    water_jet: 'Wasserstrahl',
    wound: 'Wunde'
};
export function getTranslationForLabel(label) {
    return translationMap[label] ?? label;
}
const colourMap = {
    outside: '#e74c3c', polyp: '#f39c12', needle: '#3498db', blood: '#e74c3c',
    snare: '#9b59b6', grasper: '#2ecc71', water_jet: '#1abc9c', appendix: '#f1c40f',
    ileum: '#e67e22', diverticule: '#34495e', ileocaecalvalve: '#95a5a6',
    nbi: '#8e44ad', low_quality: '#7f8c8d', wound: '#c0392b'
};
export function getColorForLabel(label) {
    return colourMap[label] ?? '#95a5a6';
}
export const formatTime = (seconds) => {
    if (!seconds || seconds < 0)
        return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
