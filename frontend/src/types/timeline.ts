import type { Segment } from '@/stores/videoStore';

export interface TimeMarker {
  time: number;
  position: number;
}

export interface LabelGroup {
  labelName: string;
  color: string;
  segments: Segment[];
}

// Interface für API-Segment-Daten aus dem LabelSegmentSerializer
export interface ApiSegment {
  id: number;
  video_id: number;
  label_id: number;
  start_frame_number: number;
  end_frame_number: number;
}