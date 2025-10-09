# Phase 1.3: Video Masking Implementation

**Status:** 🚧 IN PROGRESS  
**Started:** October 9, 2025  
**Priority:** HIGH  
**Dependencies:** Phase 1.1 ✅ Complete  

---

## Executive Summary

Phase 1.3 ergänzt die **bereits existierende Video-Masking-Funktionalität** um fehlende Device-Masken und Tests. Die Kern-Implementierung wurde in Phase 1.1 abgeschlossen und ist funktional.

**Wichtig:** Die Backend-API (`VideoApplyMaskView`) ist bereits implementiert und funktioniert synchron. Celery-Integration erfolgt später in Phase 1.2.

---

## Current Implementation Status

### ✅ Already Implemented (Phase 1.1)

1. **Backend Endpoint**
   - `POST /api/video-apply-mask/{id}/` - Fully functional
   - Supports both device masks and custom ROI
   - Processing methods: streaming (default) or direct
   - Error handling with processing history tracking

2. **Core Functions** (lx_anonymizer)
   - `FrameCleaner._mask_video()` - FFmpeg masking with NVENC/CPU fallback
   - `FrameCleaner._load_mask()` - Load device-specific mask from JSON
   - `FrameCleaner._create_mask_config_from_roi()` - Convert ROI to mask config
   - `FrameCleaner._validate_roi()` - Validate ROI parameters

3. **Hardware Acceleration**
   - NVENC detection and automatic fallback
   - Encoder optimization: `_build_encoder_cmd()`
   - Two masking strategies:
     * Simple crop (left strip removal)
     * Complex drawbox (multiple regions)

4. **Existing Device Masks**
   - ✅ `olympus_cv_1500_mask.json` - Olympus CV-1500
   - ✅ `generic_mask.json` - Generic fallback

---

## Missing Components

### 1. Additional Device Masks

**Current Coverage:**
- ✅ Olympus CV-1500
- ⏳ Pentax EPT-7000
- ⏳ Fujifilm 4450HD

**Required Masks:**

```json
// pentax_ept_7000_mask.json
{
  "image_width": 1920,
  "image_height": 1080,
  "endoscope_image_x": 600,
  "endoscope_image_y": 50,
  "endoscope_image_width": 1300,
  "endoscope_image_height": 1000,
  "description": "Mask configuration for Pentax EPT-7000 endoscope processor"
}
```

```json
// fujifilm_4450hd_mask.json
{
  "image_width": 1920,
  "image_height": 1080,
  "endoscope_image_x": 580,
  "endoscope_image_y": 20,
  "endoscope_image_width": 1320,
  "endoscope_image_height": 1040,
  "description": "Mask configuration for Fujifilm 4450HD endoscope processor"
}
```

**Note:** Koordinaten sind **Platzhalter** und müssen mit echten Videos verifiziert werden!

### 2. Streaming Masking Variant

**Already Available:**
- `FrameCleaner._mask_video()` uses FFmpeg (effectively streaming)
- `-nostdin` flag prevents hanging
- NVENC acceleration for fast processing

**Optional Enhancement:**
```python
def _mask_video_streaming(
    self,
    input_video: Path,
    mask_config: Dict[str, Any],
    output_video: Path,
    use_named_pipe: bool = True
) -> bool:
    """
    Streaming variant using named pipes for memory-efficient processing.
    
    NOTE: Current _mask_video() already uses FFmpeg streaming.
    This variant is OPTIONAL for advanced use cases.
    """
    # Implementation using named pipes (like remove_frames_from_video_streaming)
    pass
```

**Recommendation:** Nur implementieren wenn Performance-Probleme auftreten.

### 3. Test Coverage

**Missing Tests:**

```python
# tests/views/video/test_masking.py

class TestVideoMasking:
    """Test video masking functionality"""
    
    def test_apply_device_mask_olympus(self, sample_video):
        """Test Olympus CV-1500 mask application"""
        pass
    
    def test_apply_device_mask_pentax(self, sample_video):
        """Test Pentax EPT-7000 mask application"""
        pass
    
    def test_apply_device_mask_fujifilm(self, sample_video):
        """Test Fujifilm 4450HD mask application"""
        pass
    
    def test_apply_custom_roi_mask(self, sample_video):
        """Test custom ROI masking"""
        pass
    
    def test_mask_video_creates_processing_history(self, sample_video):
        """Verify processing history is created"""
        pass
    
    def test_mask_video_updates_anonymized_file(self, sample_video):
        """Verify video.anonymized_file is updated"""
        pass
    
    def test_mask_video_error_handling(self, invalid_video):
        """Test error handling for invalid videos"""
        pass
    
    def test_mask_config_validation(self):
        """Test ROI validation logic"""
        pass
```

---

## Implementation Tasks

### Task 1: Create Missing Device Masks (30 minutes)

**Priority:** HIGH  
**Risk:** LOW - Simple JSON files

**Steps:**
1. Create `pentax_ept_7000_mask.json`
2. Create `fujifilm_4450hd_mask.json`
3. Update `generic_mask.json` with realistic defaults
4. Document mask coordinate measurement process

**Deliverables:**
- ✅ 3 new mask files in `libs/lx-anonymizer/lx_anonymizer/masks/`
- ✅ Documentation on how to create new masks

**Acceptance Criteria:**
- Masks load without errors via `_load_mask()`
- JSON structure matches olympus_cv_1500 format
- Coordinates are within reasonable ranges (0-1920, 0-1080)

### Task 2: Test Suite for Masking (3-4 hours)

**Priority:** CRITICAL  
**Risk:** MEDIUM - Requires test video fixtures

**Steps:**
1. Create test fixtures (small sample videos)
2. Implement `test_masking.py` with 8 test cases
3. Run tests and verify all pass
4. Add tests to CI/CD pipeline

**Deliverables:**
- ✅ `tests/views/video/test_masking.py` (8 tests)
- ✅ Test fixtures in `test-data/videos/`
- ✅ CI integration

**Acceptance Criteria:**
- All tests pass
- Code coverage >80% for masking views
- Tests verify file creation and database updates

### Task 3: Documentation Updates (1 hour)

**Priority:** MEDIUM  
**Risk:** LOW

**Steps:**
1. Update `VIDEO_CORRECTION_MODULES.md` with masking details
2. Create `DEVICE_MASK_CONFIGURATION.md` guide
3. Update ANONYMIZER.md Phase 1.3 status

**Deliverables:**
- ✅ Updated documentation
- ✅ Mask creation tutorial
- ✅ Phase 1.3 marked complete

---

## Conservative Approach

**Warum konservativ?**
1. Backend-API ist bereits funktional
2. Masking-Logik ist getestet (verwendet in video_import.py)
3. FFmpeg-Integration ist stabil

**Was NICHT tun:**
- ❌ Masking-Logik neu implementieren
- ❌ FFmpeg-Kommandos ändern (funktioniert bereits)
- ❌ Backend-API umstrukturieren

**Was tun:**
- ✅ Fehlende Device-Masken ergänzen
- ✅ Tests schreiben für bestehenden Code
- ✅ Dokumentation vervollständigen

---

## Testing Strategy

### Unit Tests
- Mask loading logic
- ROI validation
- Config creation from ROI

### Integration Tests
- Full masking workflow (API → FrameCleaner → FFmpeg)
- Processing history creation
- Error handling

### Manual Testing
- Test each device mask with real video
- Verify masked areas are correctly blacked out
- Check video quality and file size

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Device mask coordinates wrong | MEDIUM | HIGH | Verify with real videos before production |
| FFmpeg encoding fails | LOW | HIGH | Error handling already implemented |
| NVENC not available | LOW | MEDIUM | CPU fallback already works |
| Test fixtures too large | MEDIUM | LOW | Use small 5-second sample videos |

---

## Success Criteria

**Phase 1.3 Complete when:**
1. ✅ All 3 device masks created and tested
2. ✅ Test suite passes with >80% coverage
3. ✅ Documentation complete with mask creation guide
4. ✅ Manual testing confirms masks work correctly
5. ✅ CI/CD pipeline includes masking tests

**Estimated Effort:** 4-6 hours (faster than original 4-6 days!)

**Why faster?** Core implementation already done in Phase 1.1.

---

## Next Steps After Phase 1.3

1. **Phase 1.2** - Celery Integration (convert sync to async)
2. **Phase 5.1** - Comprehensive Test Suite (expand coverage)
3. **Phase 5.2** - Error Handling & UX (improve user feedback)

---

## Notes

- Device mask coordinates are **placeholders** - measure from real videos
- Current implementation uses synchronous processing (works for MVP)
- Celery conversion planned for Phase 1.2 (makes masking async)
- NVENC acceleration already working on supported hardware
