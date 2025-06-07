import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Video, VideoFilters, VideoState, PaginatedResponse } from '@/types'
import { videoApi } from '@/services'
import { useErrorHandler } from '@/composables/useErrorHandler'

export const useVideoStore = defineStore('video', () => {
  // State
  const videos = ref<Video[]>([])
  const currentVideo = ref<Video | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<VideoFilters>({})
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // Error handler
  const { handleError } = useErrorHandler()

  // Computed
  const hasVideos = computed(() => videos.value.length > 0)
  const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

  // Actions
  const fetchVideos = async (params?: { page?: number; filters?: VideoFilters }) => {
    try {
      loading.value = true
      error.value = null
      
      const queryParams = {
        page: params?.page || pagination.value.page,
        page_size: pagination.value.pageSize,
        ...params?.filters,
        ...filters.value
      }

      const response = await videoApi.getVideos(queryParams)
      
      videos.value = response.results
      pagination.value = {
        ...pagination.value,
        page: params?.page || pagination.value.page,
        total: response.count
      }
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
    } finally {
      loading.value = false
    }
  }

  const fetchVideoById = async (id: number) => {
    try {
      loading.value = true
      error.value = null
      
      const video = await videoApi.getVideo(id)
      currentVideo.value = video
      
      return video
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const uploadVideo = async (file: File, onProgress?: (progress: number) => void) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await videoApi.uploadVideo(file, onProgress)
      
      // Add new video to the list
      videos.value.unshift(response)
      pagination.value.total += 1
      
      return response
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteVideo = async (id: number) => {
    try {
      loading.value = true
      error.value = null
      
      await videoApi.deleteVideo(id)
      
      // Remove video from list
      videos.value = videos.value.filter(v => v.id !== id)
      pagination.value.total -= 1
      
      // Clear current video if it was deleted
      if (currentVideo.value?.id === id) {
        currentVideo.value = null
      }
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFilters = (newFilters: VideoFilters) => {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1 // Reset to first page
    fetchVideos()
  }

  const clearFilters = () => {
    filters.value = {}
    pagination.value.page = 1
    fetchVideos()
  }

  const setCurrentVideo = (video: Video | null) => {
    currentVideo.value = video
  }

  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    videos.value = []
    currentVideo.value = null
    loading.value = false
    error.value = null
    filters.value = {}
    pagination.value = {
      page: 1,
      pageSize: 20,
      total: 0
    }
  }

  return {
    // State
    videos,
    currentVideo,
    loading,
    error,
    filters,
    pagination,
    
    // Computed
    hasVideos,
    totalPages,
    
    // Actions
    fetchVideos,
    fetchVideoById,
    uploadVideo,
    deleteVideo,
    updateFilters,
    clearFilters,
    setCurrentVideo,
    clearError,
    reset
  }
})