# Phase 1.2: Celery Task Infrastructure for Video Correction

## Overview

Convert synchronous video correction operations (masking, frame removal) to asynchronous Celery tasks to prevent blocking on large video files and provide real-time progress tracking.

## Current Status

**Phase 1.1** ✅ COMPLETE (October 2025)
- Synchronous video correction API endpoints implemented
- All operations work correctly but block until completion
- No progress reporting during long-running operations

**Phase 1.4** ✅ COMPLETE (October 2025)
- Segment update logic implemented and tested
- Ready for async integration

## Problem Statement

Current video correction endpoints run synchronously:
- **Masking operations:** Can take 2-5 minutes for 1080p videos
- **Frame removal:** Can take 3-10 minutes for long videos
- **Analysis:** Can take 5-15 minutes for full video analysis

This causes:
- ❌ HTTP request timeouts on large files (>500 MB)
- ❌ No progress visibility for users
- ❌ UI blocking during processing
- ❌ No ability to cancel long-running operations
- ❌ Poor user experience for medical staff

## Goals

1. **Async Processing:** Convert all video correction operations to Celery tasks
2. **Progress Tracking:** Real-time progress updates (0-100%)
3. **Error Recovery:** Graceful failure handling with retry mechanisms
4. **Task Management:** Allow task cancellation and status monitoring

## Scope

### In Scope

#### 1. Infrastructure Setup (Days 1-2)
- [ ] Configure Celery in Django settings
- [ ] Set up Redis/RabbitMQ as message broker
- [ ] Add Celery workers to Docker Compose
- [ ] Configure task result backend

#### 2. Task Implementation (Days 3-4)
- [ ] Convert `VideoApplyMaskView` to `apply_mask_task`
- [ ] Convert `VideoRemoveFramesView` to `remove_frames_task`
- [ ] Convert `VideoAnalyzeView` to `analyze_video_task`
- [ ] Convert `VideoReprocessView` to `reprocess_video_task`

#### 3. Progress Reporting (Days 5-6)
- [ ] Implement `TaskStatusView` (GET `/api/task-status/{task_id}/`)
- [ ] Add progress state updates every N frames
- [ ] Return percentage complete (0-100)
- [ ] Include error messages on failure

#### 4. Frontend Integration (Day 7)
- [ ] Update `AnonymizationCorrectionComponent` to poll task status
- [ ] Add progress bar component
- [ ] Implement task cancellation button
- [ ] Show estimated time remaining

### Out of Scope

- Real-time WebSocket updates (future enhancement)
- Task prioritization/queuing logic (future enhancement)
- Distributed task processing across multiple workers (future enhancement)

## Technical Design

### Architecture

```
User Request → API View → Celery Task → Worker
                ↓                          ↓
         Return task_id              Process Video
                ↓                          ↓
    Frontend polls status      Update progress state
                ↓                          ↓
       Show progress bar          Mark complete/failed
```

### Task Structure

```python
@shared_task(bind=True)
def apply_mask_task(self, video_id: int, mask_config: dict) -> dict:
    """
    Apply mask to video with progress tracking.
    
    Args:
        video_id: VideoFile primary key
        mask_config: Mask configuration (device or custom ROI)
    
    Returns:
        {
            'success': bool,
            'output_path': str,
            'processing_time': float
        }
    """
    try:
        # Update state: PENDING → STARTED
        self.update_state(state='STARTED', meta={'progress': 0})
        
        video = VideoFile.objects.get(pk=video_id)
        frame_cleaner = FrameCleaner()
        
        # Process video with progress callbacks
        for i, frame in enumerate(process_frames(video)):
            progress = int((i / total_frames) * 100)
            self.update_state(state='PROGRESS', meta={'progress': progress})
        
        # Update state: PROGRESS → SUCCESS
        self.update_state(state='SUCCESS', meta={'progress': 100})
        
        return {
            'success': True,
            'output_path': str(output_path),
            'processing_time': time.time() - start_time
        }
        
    except Exception as e:
        # Update state: * → FAILURE
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise
```

### API Endpoints

#### POST `/api/video-apply-mask/{id}/`
**Before (Synchronous):**
```json
{
  "output_file": "/path/to/masked.mp4",
  "processing_time": 125.5
}
```

**After (Async):**
```json
{
  "task_id": "abc-123-def-456",
  "status": "pending",
  "message": "Masking started in background"
}
```

#### GET `/api/task-status/{task_id}/` (NEW)
```json
{
  "task_id": "abc-123-def-456",
  "state": "PROGRESS",
  "progress": 45,
  "status": "Processing frame 450/1000",
  "result": null
}
```

**Final State:**
```json
{
  "task_id": "abc-123-def-456",
  "state": "SUCCESS",
  "progress": 100,
  "status": "Complete",
  "result": {
    "output_file": "/path/to/masked.mp4",
    "processing_time": 125.5
  }
}
```

## Dependencies

### Python Packages
```toml
[tool.poetry.dependencies]
celery = "^5.3.0"
redis = "^5.0.0"  # or kombu for RabbitMQ
django-celery-results = "^2.5.0"
```

### Infrastructure
- **Message Broker:** Redis (recommended) or RabbitMQ
- **Result Backend:** Redis or Django database
- **Worker Process:** Celery worker daemon

### Docker Compose
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  celery-worker:
    build: .
    command: celery -A lx_annotate worker --loglevel=info
    depends_on:
      - redis
      - db
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
```

## Implementation Steps

### Phase 1: Setup (Days 1-2)

1. **Install Dependencies**
   ```bash
   poetry add celery redis django-celery-results
   ```

2. **Configure Celery**
   ```python
   # lx_annotate/celery.py
   from celery import Celery
   
   app = Celery('lx_annotate')
   app.config_from_object('django.conf:settings', namespace='CELERY')
   app.autodiscover_tasks()
   ```

3. **Django Settings**
   ```python
   # settings.py
   CELERY_BROKER_URL = 'redis://localhost:6379/0'
   CELERY_RESULT_BACKEND = 'django-db'
   CELERY_TASK_TRACK_STARTED = True
   CELERY_TASK_TIME_LIMIT = 3600  # 1 hour max
   ```

4. **Run Migrations**
   ```bash
   python manage.py migrate django_celery_results
   ```

### Phase 2: Task Implementation (Days 3-4)

1. **Create Task Module**
   ```bash
   touch libs/endoreg-db/endoreg_db/tasks/video_correction.py
   ```

2. **Implement Tasks**
   - `apply_mask_task()`
   - `remove_frames_task()`
   - `analyze_video_task()`
   - `reprocess_video_task()`

3. **Update Views**
   - Replace synchronous processing with `task.delay()`
   - Return `task_id` in response
   - Keep backward compatibility with `task_id=null` flag

### Phase 3: Progress Tracking (Days 5-6)

1. **Implement TaskStatusView**
   ```python
   class TaskStatusView(APIView):
       def get(self, request, task_id):
           result = AsyncResult(task_id)
           return Response({
               'task_id': task_id,
               'state': result.state,
               'progress': result.info.get('progress', 0),
               'result': result.result if result.successful() else None
           })
   ```

2. **Add Progress Callbacks**
   - Update task state every 50 frames
   - Calculate percentage: `(current_frame / total_frames) * 100`
   - Store intermediate results for resume capability

### Phase 4: Frontend Integration (Day 7)

1. **Add Polling Logic**
   ```typescript
   async function pollTaskProgress(taskId: string) {
     const interval = setInterval(async () => {
       const status = await fetch(`/api/task-status/${taskId}/`);
       const data = await status.json();
       
       progressPercent.value = data.progress;
       
       if (data.state === 'SUCCESS' || data.state === 'FAILURE') {
         clearInterval(interval);
       }
     }, 1000);  // Poll every second
   }
   ```

2. **Update UI Components**
   - Show progress bar during processing
   - Display estimated time remaining
   - Add cancel button (calls `task.revoke()`)

## Acceptance Criteria

### Functional Requirements
- ✅ Video masking runs in background without blocking UI
- ✅ Progress bar shows accurate completion percentage (±5%)
- ✅ Users can navigate away and return to see progress
- ✅ Failed tasks show actionable error messages
- ✅ Task history persists across server restarts

### Performance Requirements
- ✅ API response time < 200ms (just returns task_id)
- ✅ Progress updates every 1-2 seconds
- ✅ Worker can process videos up to 2GB
- ✅ Multiple tasks can run concurrently (up to 4 workers)

### Error Handling
- ✅ Tasks retry automatically on network errors (max 3 attempts)
- ✅ Timeout after 1 hour for stuck tasks
- ✅ Graceful degradation if Redis unavailable (sync fallback)

## Testing Strategy

### Unit Tests
```python
# tests/tasks/test_video_correction_tasks.py
def test_apply_mask_task_success():
    """Test successful masking task execution."""
    result = apply_mask_task.delay(video_id=1, mask_config={...})
    assert result.state == 'SUCCESS'
    assert result.result['success'] is True

def test_task_progress_updates():
    """Test progress reporting during task execution."""
    result = apply_mask_task.delay(video_id=1, mask_config={...})
    time.sleep(2)
    assert result.info['progress'] > 0
```

### Integration Tests
- Full workflow: API call → Task execution → Result retrieval
- Test with real video files (100 MB, 500 MB, 1 GB)
- Test concurrent task execution (4 simultaneous masks)

### Load Tests
- 100 concurrent task submissions
- Verify queue doesn't grow unbounded
- Monitor Redis memory usage

## Rollback Plan

### If Phase 1.2 Needs Revert

1. **Remove Celery Dependency:**
   ```bash
   poetry remove celery redis django-celery-results
   ```

2. **Revert API Views:**
   - Remove `task.delay()` calls
   - Restore synchronous processing
   - Remove `task_id` from responses

3. **Database:**
   - Keep `django_celery_results` tables (no harm)
   - Or run: `python manage.py migrate django_celery_results zero`

4. **Docker Compose:**
   - Comment out Redis and Celery worker services

## Migration Path

### Backward Compatibility

Keep both sync and async modes during transition:

```python
USE_ASYNC_TASKS = getattr(settings, 'USE_ASYNC_TASKS', False)

if USE_ASYNC_TASKS:
    task = apply_mask_task.delay(video_id, mask_config)
    return Response({'task_id': task.id})
else:
    # Synchronous fallback (Phase 1.1 behavior)
    result = apply_mask_sync(video_id, mask_config)
    return Response({'task_id': None, 'result': result})
```

Enable async gradually:
1. Week 1: Test with internal users
2. Week 2: Enable for 10% of production traffic
3. Week 3: Enable for 50% of production traffic
4. Week 4: Enable for 100% (remove sync code)

## Success Metrics

### Before (Phase 1.1)
- ❌ Average masking time: 180 seconds (blocking)
- ❌ User abandonment rate: 15% (timeouts)
- ❌ Support tickets: 5/week (stuck operations)

### After (Phase 1.2)
- ✅ Average API response: <200ms (immediate)
- ✅ User abandonment rate: <2% (progress visible)
- ✅ Support tickets: <1/week (self-service)
- ✅ Concurrent processing: 4x throughput

## Related Work

### Completed
- ✅ Phase 1.1: Video Correction API Endpoints
- ✅ Phase 1.4: Segment Update Logic
- ✅ Phase 3.2: Video URL Query Parameters

### Future
- Phase 4.1: Comprehensive Test Suite (includes Celery task tests)
- Advanced: WebSocket real-time updates (replace polling)
- Advanced: Distributed workers for high-volume processing

## References

- **Celery Documentation:** https://docs.celeryq.dev/
- **Django Celery Results:** https://django-celery-results.readthedocs.io/
- **ANONYMIZER.md:** Phase 1.2 section
- **Phase 1.1 Implementation:** `/libs/endoreg-db/endoreg_db/views/video/correction.py`

## Estimated Effort

**Total:** 5-7 days (1 developer)

**Breakdown:**
- Infrastructure setup: 2 days
- Task implementation: 2 days
- Progress tracking: 2 days
- Frontend integration: 1 day
- Testing & documentation: 1-2 days

**Priority:** MEDIUM (improves UX but not blocking)

## Labels

- `enhancement`
- `backend`
- `celery`
- `async`
- `video-correction`
- `phase-1.2`

---

**Created:** October 9, 2025  
**Assignee:** TBD  
**Milestone:** Phase 1 - Video Correction Infrastructure
