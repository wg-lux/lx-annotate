# 📦 Media Import API – Endpoint Documentation

## Overview

The Media Import API enables uploading, retrieving, and managing video files and their metadata. Endpoints are clearly separated for streaming and metadata access.

---

## Endpoint Structure

### 1. Video Streaming

**Raw Video:**  
```http
GET /api/media/videos/{id}/?type=raw
```
- Returns the raw video stream (`video/mp4`).
- Content-Type: `video/mp4`

**Anonymized Video:**  
```http
GET /api/media/videos/{id}/?type=processed
```
- Returns the anonymized video stream (`video/mp4`).
- Content-Type: `video/mp4`

**Best Available Video (Fallback):**  
```http
GET /api/media/videos/{id}/
```
- Returns the best available video (raw or anonymized).
- Content-Type: `video/mp4`

---

### 2. Video Metadata

**Video Details:**  
```http
GET /api/media/videos/{id}/details/
```
- Returns video metadata as JSON.
- Content-Type: `application/json`
- Fields: `id`, `filename`, `duration`, `video_url`, etc.

**Example Response:**
```json
{
  "id": 51,
  "filename": "ENDO_2025-10-09_12-00-00.mp4",
  "duration": 120.5,
  "video_url": "http://localhost:8000/api/media/videos/51/?type=raw",
  "processed_url": "http://localhost:8000/api/media/videos/51/?type=processed"
}
```

---

### 3. Video Upload (optional, if implemented)

**Upload Video:**  
```http
POST /api/media/videos/import/
```
- Expects a multipart form-data with video file.
- Response: Metadata of the imported video.

---

## Example Workflow

1. **Import video:**  
   `POST /api/media/videos/import/`  
   → Response contains new video ID.

2. **Retrieve metadata:**  
   `GET /api/media/videos/{id}/details/`  
   → JSON with all relevant fields.

3. **Stream video:**  
   - Raw: `GET /api/media/videos/{id}/?type=raw`
   - Anonymized: `GET /api/media/videos/{id}/?type=processed`

---

## Notes

- Separation of streaming and metadata endpoints ensures a clear API architecture.
- URLs are consistent and RESTful.
- For frontend integration: always use `/details/` for metadata, `/` with type query for video streams.
