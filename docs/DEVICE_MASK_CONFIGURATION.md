# Device Mask Configuration Guide

**Purpose:** Guide for creating and maintaining device-specific video masks for endoscope processors.

**Last Updated:** October 9, 2025

---

## Overview

Device masks define the regions in endoscope video footage that contain **sensitive patient metadata** (names, dates, case numbers) vs the **clean endoscope image**. By masking the metadata regions with black rectangles, we preserve the medical content while removing identifiable information.

---

## Mask File Structure

### Location
```
libs/lx-anonymizer/lx_anonymizer/masks/
├── olympus_cv_1500_mask.json      ✅ Verified
├── pentax_ept_7000_mask.json      ⚠️ Placeholder
├── fujifilm_4450hd_mask.json      ⚠️ Placeholder
└── generic_mask.json              ✅ Fallback
```

### JSON Schema

```json
{
  "image_width": 1920,           // Total video width (px)
  "image_height": 1080,          // Total video height (px)
  "endoscope_image_x": 550,      // X coordinate of endoscope image start
  "endoscope_image_y": 0,        // Y coordinate of endoscope image start
  "endoscope_image_width": 1350, // Width of clean endoscope image
  "endoscope_image_height": 1080,// Height of clean endoscope image
  "description": "Device name"   // Human-readable description
}
```

### Coordinate System

```
(0,0) ┌──────────────────────────────────────┐
      │ METADATA STRIP │  ENDOSCOPE IMAGE   │
      │ (Patient info) │  (Medical content) │
      │                │                    │
      │  X=0           │  X=550             │ X=1920
      │  Width=550     │  Width=1350        │
      └──────────────────────────────────────┘
                                           (1920,1080)
```

**Masked Regions (black):**
- Left strip: `(0, 0)` to `(endoscope_image_x, image_height)`
- Right strip: `(endoscope_image_x + endoscope_image_width, 0)` to `(image_width, image_height)`
- Top strip: `(endoscope_image_x, 0)` to `(endoscope_image_x + endoscope_image_width, endoscope_image_y)`
- Bottom strip: `(endoscope_image_x, endoscope_image_y + endoscope_image_height)` to `(endoscope_image_x + endoscope_image_width, image_height)`

**Preserved Region (visible):**
- Endoscope image: `(endoscope_image_x, endoscope_image_y)` to `(endoscope_image_x + endoscope_image_width, endoscope_image_y + endoscope_image_height)`

---

## Creating a New Device Mask

### Step 1: Obtain Reference Video

**Requirements:**
- Real video from target endoscope processor
- Minimum 10 seconds duration
- Contains visible patient metadata (for verification)
- Typical resolution (usually 1920x1080 or 1280x720)

**Sources:**
- Clinical partner institutions
- Device manufacturer demo videos
- Previously imported videos

### Step 2: Analyze Video Frames

**Tools:**
- VLC Media Player (Tools → Codec Information)
- FFmpeg: `ffmpeg -i video.mp4 -frames:v 1 frame.png`
- Python + OpenCV:

```python
import cv2
video = cv2.VideoCapture('reference_video.mp4')
ret, frame = video.read()
height, width = frame.shape[:2]
print(f"Resolution: {width}x{height}")

# Display frame with coordinates
cv2.imshow('Reference Frame', frame)
cv2.waitKey(0)
```

### Step 3: Measure Coordinates

**Method 1: VLC Media Player**
1. Open video in VLC
2. Tools → Effects and Filters → Video Effects → Geometry
3. Enable "Transform" to see pixel coordinates on mouse hover
4. Identify endoscope image boundaries:
   - Move mouse to **left edge** of endoscope image → note X coordinate
   - Move mouse to **top edge** → note Y coordinate
   - Move mouse to **right edge** → calculate width
   - Move mouse to **bottom edge** → calculate height

**Method 2: Python + OpenCV (Interactive)**

```python
import cv2
import numpy as np

def mouse_callback(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        print(f"Clicked: X={x}, Y={y}")

# Load first frame
cap = cv2.VideoCapture('reference_video.mp4')
ret, frame = cap.read()

# Add crosshair for precision
cv2.namedWindow('Mask Measurement')
cv2.setMouseCallback('Mask Measurement', mouse_callback)

while True:
    display = frame.copy()
    cv2.imshow('Mask Measurement', display)
    
    key = cv2.waitKey(1)
    if key == 27:  # ESC to exit
        break

cap.release()
cv2.destroyAllWindows()
```

**What to measure:**
1. **Left edge of endoscope image** → `endoscope_image_x`
2. **Top edge of endoscope image** → `endoscope_image_y`
3. **Right edge of endoscope image** → calculate width: `width = right_x - endoscope_image_x`
4. **Bottom edge of endoscope image** → calculate height: `height = bottom_y - endoscope_image_y`

### Step 4: Create Mask File

```bash
# Create new mask file
cd libs/lx-anonymizer/lx_anonymizer/masks/
cp generic_mask.json your_device_mask.json
```

**Edit with measured values:**

```json
{
  "image_width": 1920,              // From video resolution
  "image_height": 1080,             // From video resolution
  "endoscope_image_x": 580,         // Measured left edge
  "endoscope_image_y": 20,          // Measured top edge
  "endoscope_image_width": 1320,    // Measured width
  "endoscope_image_height": 1040,   // Measured height
  "description": "Your Device Name",
  "notes": [
    "Verified with video: filename.mp4",
    "Measurement date: 2025-10-09",
    "Measured by: YourName"
  ]
}
```

### Step 5: Verify Mask

**Test masking with Python:**

```python
from pathlib import Path
from lx_anonymizer import FrameCleaner

# Initialize cleaner
cleaner = FrameCleaner()

# Load your mask
mask_config = cleaner._load_mask('your_device')

# Test masking
success = cleaner._mask_video(
    input_video=Path('reference_video.mp4'),
    mask_config=mask_config,
    output_video=Path('test_masked.mp4')
)

print(f"Masking {'succeeded' if success else 'failed'}")
# Review test_masked.mp4: metadata should be black, endoscope image visible
```

**Visual Verification Checklist:**
- ✅ Patient metadata areas are completely black
- ✅ Endoscope image is fully visible (no black bars cutting into it)
- ✅ No flickering or artifacts
- ✅ Video plays smoothly
- ✅ File size reasonable (not bloated from re-encoding issues)

### Step 6: Add to Device Database

**Update device processor in Django:**

```python
# In Django shell or migration
from endoreg_db.models import EndoscopeProcessor

processor = EndoscopeProcessor.objects.get(name='Your Device')
processor.mask_file = 'your_device'  # Filename without _mask.json
processor.save()
```

**Or create new processor:**

```python
EndoscopeProcessor.objects.create(
    name='Fujifilm 4450HD',
    manufacturer='Fujifilm',
    model='4450HD',
    mask_file='fujifilm_4450hd',
    typical_resolution='1920x1080'
)
```

---

## Current Device Coverage

| Device | Status | Mask File | Verified |
|--------|--------|-----------|----------|
| Olympus CV-1500 | ✅ Ready | `olympus_cv_1500_mask.json` | Yes |
| Pentax EPT-7000 | ⚠️ Placeholder | `pentax_ept_7000_mask.json` | **No - needs verification** |
| Fujifilm 4450HD | ⚠️ Placeholder | `fujifilm_4450hd_mask.json` | **No - needs verification** |
| Generic Fallback | ✅ Ready | `generic_mask.json` | Yes (conservative) |

---

## Troubleshooting

### Issue: Mask cuts into endoscope image

**Cause:** `endoscope_image_x` too large  
**Fix:** Reduce `endoscope_image_x` by 10-20px, retest

### Issue: Patient metadata still visible

**Cause:** `endoscope_image_x` too small  
**Fix:** Increase `endoscope_image_x` to cover metadata strip

### Issue: Black bars on top/bottom

**Cause:** `endoscope_image_y` or `endoscope_image_height` incorrect  
**Fix:** Adjust Y coordinate and height, retest

### Issue: FFmpeg error "Invalid crop dimensions"

**Cause:** Coordinates exceed video dimensions  
**Fix:** Verify `image_width` and `image_height` match actual video

### Issue: Mask file not loading

**Cause:** JSON syntax error  
**Fix:** Validate JSON with `python -m json.tool your_mask.json`

---

## Best Practices

1. **Always test with real videos** - Screenshots may not show full metadata
2. **Use conservative margins** - Better to mask 10px too much than too little
3. **Document measurements** - Add notes about reference video and date
4. **Version control** - Commit mask files to git with clear commit messages
5. **Regular verification** - Test masks when device firmware updates

---

## FFmpeg Masking Strategies

The masking implementation uses two strategies depending on mask geometry:

### Simple Crop (Fast)
When metadata is only on left strip (`endoscope_image_y == 0` and full height):

```bash
ffmpeg -i input.mp4 -vf "crop=in_w-550:in_h:550:0" output.mp4
```

**Advantages:**
- Very fast (no re-encoding needed)
- Minimal quality loss
- Works with `-c copy` for audio

### Complex Drawbox (Flexible)
When metadata is on multiple sides:

```bash
ffmpeg -i input.mp4 -vf "drawbox=0:0:550:1080:color=black@1:t=fill" output.mp4
```

**Advantages:**
- Supports arbitrary mask shapes
- Can mask top/bottom/multiple regions
- Still uses hardware acceleration (NVENC) when available

---

## API Integration

### Using Device Mask via API

```http
POST /api/video-apply-mask/{video_id}/
Content-Type: application/json

{
  "mask_type": "device",
  "device_name": "olympus_cv_1500",
  "processing_method": "streaming"
}
```

### Using Custom ROI via API

```http
POST /api/video-apply-mask/{video_id}/
Content-Type: application/json

{
  "mask_type": "custom",
  "roi": {
    "x": 550,
    "y": 0,
    "width": 1350,
    "height": 1080
  },
  "processing_method": "streaming"
}
```

---

## Related Documentation

- `VIDEO_CORRECTION_MODULES.md` - Complete API documentation
- `ANONYMIZER.md` - Overall anonymization workflow
- `PHASE_1_3_IMPLEMENTATION_PLAN.md` - Implementation details

---

## Maintenance

**Quarterly Review:**
- Verify all device masks still work with latest videos
- Check for new endoscope processor models
- Update placeholder masks with verified coordinates

**After Device Updates:**
- Test mask compatibility with new firmware versions
- Adjust coordinates if UI layout changed
- Document any changes in mask file notes

---

## Contact

For mask verification or new device requests, contact:
- Technical lead: [Your contact info]
- Clinical partners: [Partner contact info]
