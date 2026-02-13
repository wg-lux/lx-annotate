## 📘 Timeline.vue – Komponente zur Videosegmentierung

### **Zweck**

Die `Timeline`-Komponente visualisiert zeitbasierte Annotationen (Segmente) eines Videos, gruppiert nach Label. Sie erlaubt:

* Anzeige von Zeitmarkierungen und Segmenten
* Visuelles Navigieren und Springen im Video
* Interaktive Bearbeitung (Segment-Resize)
* Neue Segmenterstellung per Klick

---

### **Props**

| Name          | Typ            | Beschreibung                                                    |
| ------------- | -------------- | --------------------------------------------------------------- |
| `duration`    | `number`       | Gesamtdauer des Videos (in Sekunden), **Pflichtfeld**           |
| `currentTime` | `number`       | Aktuelle Zeit im Video (in Sekunden), für den Cursor            |
| `segments`    | `Segment[]`    | Lokale (nicht persistierte) Segmente                            |
| `apiSegments` | `ApiSegment[]` | Serverseitig geladene Segmente (frame-basiert)                  |
| `fps`         | `number`       | Frames pro Sekunde (Standard: 50), zur Frame-Zeit-Konvertierung |

---

### **Emits**

| Event           | Argumente                                         | Beschreibung                       |
| --------------- | ------------------------------------------------- | ---------------------------------- |
| `seek`          | `(targetTime: number)`                            | Springt zu gegebener Zeit im Video |
| `resize`        | `(id: number, endTime: number, endFrame: number)` | Anpassung des Segment-Endes        |
| `createSegment` | `(time: number, frame: number)`                   | Neues Segment bei Shift+Klick      |

---

### **Reaktive Referenzen (`ref`)**

| Name             | Zweck                                              |
| ---------------- | -------------------------------------------------- |
| `timelineRef`    | Zugriff auf Timeline-DOM für Koordinatenberechnung |
| `timeMarkersRef` | Zugriff auf Zeitmarkierungen                       |
| `activeSegment`  | Temporär ausgewähltes Segment beim Resizing        |
| `isResizing`     | Aktiviert Mausmove-Handler                         |
| `startX`         | Mausstartposition bei Resizing                     |
| `initialEndTime` | Ursprüngliches Segment-Ende                        |
| `lastTimestamp`  | Throttling für MouseMove                           |

---

### **Computed Properties**

| Name                | Typ            | Beschreibung                                                   |
| ------------------- | -------------- | -------------------------------------------------------------- |
| `convertedSegments` | `Segment[]`    | Umwandlung von `apiSegments` in segmentObjekte mit Zeitangaben |
| `organizedSegments` | `LabelGroup[]` | Gruppierung aller Segmente nach Label (inkl. Farbcodierung)    |
| `cursorPosition`    | `number`       | Prozentualer Ort des aktuellen Timers                          |
| `timeMarkers`       | `TimeMarker[]` | Automatisch berechnete Zeitmarken für das Header-Grid          |

---

### **Zentrale Methoden**

* **`startResize()`**: Beginnt Ziehvorgang am Segmentende
* **`onMouseMove()`**: Berechnet neue Endzeit und aktualisiert Store + emit
* **`onMouseUp()`**: Beendet Resize-Vorgang
* **`handleTimelineClick()`**: Seek oder Segmenterstellung (Shift)
* **`jumpToSegment()`**: Springt in das Segment (10% Offset zur Mitte)
* **`getSegmentStyle()`**: Berechnet Position + Breite + Farbe eines Segments

---

### **CSS & UX Features**

* Responsive Design (angepasste Label-Größen für Mobilgeräte)
* Hover-Effekte, Box-Shadows, visuelles Feedback
* Zeitlabels mit Hintergrund
* Farbige Labels mit konsistentem Farbschema

---

### **Verwendete Typen**

```ts
type Segment = {
  id: number;
  video_id: number;
  label_id: number;
  startTime: number;
  endTime: number;
  start_frame_number: number;
  end_frame_number: number;
  label: string;
  label_display: string;
  avgConfidence: number;
};

type ApiSegment = {
  id: number;
  video_id: number;
  label_id: number;
  start_frame_number: number;
  end_frame_number: number;
};

type LabelGroup = {
  labelName: string;
  color: string;
  segments: Segment[];
};

type TimeMarker = {
  time: number;
  position: number;
};
```

---

### ✅ **Typische Anwendungsfälle**

* In Video-Annotationstools für medizinische oder maschinelle Lernzwecke
* Bei Visualisierung von automatischer Segment-Erkennung
* Als Timeline-Editor für Benutzer-Eingriffe

