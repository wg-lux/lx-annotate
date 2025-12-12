import { defineStore } from 'pinia'
import axios from 'axios'

export interface ImageData {
  id: string
  imageUrl: string
  status: 'in_progress' | 'completed'
  assignedUser?: string | null
}

export const useImageStore = defineStore('image', {
  state: () => ({
    imageStatus: 'idle',
    loading: false,
    error: null as string | null,
    data: [] as ImageData[]
  }),
  actions: {
    async fetchImages() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get('/api/images/')
        this.data = response.data.map((image: any) => ({
          id: image.id,
          imageUrl: image.image_url,
          status: image.status || 'in_progress',
          assignedUser: image.assigned_user || null
        }))
      } catch (error: any) {
        this.error = error.message || 'Fehler beim Laden der Bilder'
      } finally {
        this.loading = false
      }
    }
  }
})
