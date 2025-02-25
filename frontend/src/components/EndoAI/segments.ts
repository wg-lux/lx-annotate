export interface Segment {
    id: string;
    label: string;
    label_display: string;
    startTime: number;
    endTime: number;
    avgConfidence: number; // value between 0 and 1
  }
  
  export function getSegmentStyle(segment: Segment, duration: number): Record<string, string> {
    const leftPercentage = (segment.startTime / duration) * 100;
    const widthPercentage = ((segment.endTime - segment.startTime) / duration) * 100;
    return {
      position: 'absolute',
      left: `${leftPercentage}%`,
      width: `${widthPercentage}%`,
      backgroundColor: getColorForLabel(segment.label),
    };
  }
  
  export function getColorForLabel(label: string): string {
    const colorMap: Record<string, string> = {
      appendix: '#ff9800',
      blood: '#f44336',
      diverticule: '#9c27b0',
      grasper: '#4caf50',
      ileocaecalvalve: '#3f51b5',
      ileum: '#2196f3',
      low_quality: '#9e9e9e',
      nbi: '#795548',
      needle: '#e91e63',
      outside: '#00bcd4',
      polyp: '#8bc34a',
      snare: '#ff5722',
      water_jet: '#03a9f4',
      wound: '#607d8b',
    };
    return colorMap[label] || '#757575';
  }
  
  export function jumpToSegment(segment: Segment, videoElement: HTMLVideoElement | null): void {
    if (videoElement) {
      videoElement.currentTime = segment.startTime;
    }
  }
  