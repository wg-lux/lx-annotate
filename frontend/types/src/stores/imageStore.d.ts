export interface ImageData {
    id: string;
    imageUrl: string;
    status: 'in_progress' | 'completed';
    assignedUser?: string | null;
}
export declare const useImageStore: import("pinia").StoreDefinition<"image", {
    imageStatus: string;
    loading: boolean;
    error: string;
    data: ImageData[];
}, {}, {
    fetchImages(): Promise<void>;
}>;
