# AI Training Data Export

This guide explains the current `endoreg_db`/`lx-annotate` paths for extracting
frames and annotation payloads for AI training, including GastroNet-style image
multilabel training.

## Data Safety Boundary

Use these exports only after the video has passed anonymization validation. The
export workflows are intended for anonymized processed media and derived
annotations. Raw media export is prohibited.

For clinical deployments, keep the output on the local protected storage or an
approved encrypted volume. If the exported artifact leaves the local storage
boundary, use the LuxNix envelope-encryption transfer workflow rather than
copying raw files directly.

## Recommended User Workflow

Use the application UI when the goal is to create a training-ready dataset with
minimal manual steps.

1. Finish anonymization validation for the video.
2. Open the segment annotation page and validate the clinically relevant
   segments.
3. In the export panel, select the video and mark the segments that should be
   part of the export.
4. Click **Fehlende Annotationen erzeugen** if segment annotations have not yet
   been materialized as frame-level `ImageClassificationAnnotation` rows.
5. Enable **Frames exportieren** when image files should be copied into the
   export directory.
6. Enable **Frames transkodieren** when fresh frame images should be extracted
   from the processed video. The current defaults are 30 FPS in the frontend and
   JPG frame output in the backend exporter.
7. Start the export.

The export panel calls:

- `POST /api/media/videos/<video_id>/ensure-segment-annotations/`
- `POST /api/media/videos/export-annotated/`

The annotation export writes a CSV or JSON metadata file and can also create:

- `videos/` with exported processed video files, when `export_videos` is true
- `frames/video_<video_id>/...` with exported frame files, when `export_frames`
  is true

## Export Output

The frame annotation table contains one row per frame-label annotation. The
current fields are:

- `annotation_id`
- `video_id`
- `video_hash`
- `frame_id`
- `frame_number`
- `frame_relative_path`
- `frame_timestamp`
- `label_id`
- `label_name`
- `value`
- `float_value`
- `annotator`
- `information_source_id`
- `information_source_name`
- `model_meta_id`
- `date_created`
- `date_modified`

For image classification training, use `frame_relative_path` to locate the image
under the exported `frames/` directory and use `label_name`, `label_id`,
`value`, and `float_value` as the multilabel target data.

When `use_frame_pk_paths` is enabled, exported frames use stable names like
`frame_<frame_id>.jpg`. This is the easiest layout for external PyTorch or
GastroNet-like dataloaders because the path can be derived directly from
`frame_id`.

## API Example

The export endpoint accepts snake_case payload keys.

```bash
curl -X POST "$LX_ANNOTATE_BASE_URL/api/media/videos/export-annotated/" \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": 123,
    "output_dir": "data/export/video_123_training",
    "output_path": "annotations.csv",
    "output_format": "csv",
    "use_export_flags": true,
    "export_videos": false,
    "export_frames": true,
    "transcode_frames": true,
    "transcode_fps": 30,
    "transcode_quality": 2,
    "transcode_ext": "jpg",
    "use_frame_pk_paths": true
  }'
```

Use `segment_ids` instead of `use_export_flags` when the caller wants an
explicit segment subset:

```json
{
  "video_id": 123,
  "segment_ids": [10, 11, 12],
  "output_dir": "data/export/video_123_training",
  "output_format": "json",
  "export_frames": true,
  "use_frame_pk_paths": true
}
```

## Management Command Example

The same exporter is available as a Django management command:

```bash
python manage.py export_frame_annot \
  --output-dir data/export/video_123_training \
  --output-path annotations.csv \
  --video-id 123 \
  --only-true \
  --use-export-flags \
  --export-frames \
  --transcode-frames \
  --transcode-fps 30 \
  --transcode-quality 2 \
  --transcode-ext jpg \
  --use-frame-pk-paths
```

To create frame-level annotations from selected segments before export:

```bash
python manage.py ensure_segment_annotations --video-id 123
```

Run this command only after the selected video or segment set has been reviewed;
unlike the UI backfill request, the command does not enforce a validated-only
filter. Use `--dry-run` first to inspect how many annotations would be created:

```bash
python manage.py ensure_segment_annotations --video-id 123 --dry-run
```

## Standardized AI Dataset JSON

For application-level AI datasets, use the settings page:

1. Open `/application-settings`.
2. Choose the AI dataset name and type.
3. Save the settings.
4. Click **KI-Datensatz exportieren**.

The frontend calls:

- `GET /api/settings/application/dropdowns/ai_datasets/`
- `POST /api/settings/application/ai_dataset_export/`

The export writes a validated JSON payload under
`<EXPORT_DIR>/ai_datasets/<dataset>_<type>_<timestamp>.json`.

The JSON payload includes:

- `schema_version`
- `dataset_id`
- `dataset_type`
- `ai_model_type`
- `summary`
- `patient_videos`
- `frame_annotations`

`frame_annotations` contains frame ids, frame numbers, relative paths, labels,
annotation values, annotators, information source names, model metadata ids, and
timestamps. `patient_videos` contains the standardized `lx_dtypes`
`PatientVideoFile` structure and attached video segments.

This JSON path is the better choice when downstream tooling should consume a
single typed contract instead of a flat CSV.

## GastroNet-Style Training

The current backend exposes an image multilabel training path for
`AIDataSet` rows whose:

- `dataset_type` is `image`
- `ai_model_type` is `image_multilabel_classification`

Users can start training from `/model-training`. The UI offers active image
multilabel datasets, sampling strategy controls, and backbone options including
`gastro_rn50`.

The API path is:

- `GET /api/settings/application/model_training/options/`
- `POST /api/settings/application/model_training/runs/`
- `GET /api/settings/application/model_training/runs/<run_id>/`

The equivalent management command is:

```bash
python manage.py train_image_multilabel_model \
  --dataset-id 7 \
  --backbone-name gastro_rn50 \
  --epochs 10 \
  --batch-size 32 \
  --labelset-version 1 \
  --freeze-backbone \
  --treat-unlabeled-as-negative
```

For custom training code, the helper dataset class is
`endoreg_db.utils.ai.model_training.dataset.EndoMultiLabelDataset`. It expects:

- image paths
- label vectors
- label masks

This matches the exported annotation structure: group rows by frame, create one
vector position per label, set the value from `value`, and set the mask for
labels with known annotations.

## Practical Checks

Before handing an export to model training, verify:

- The source video was anonymization-validated.
- Segment validation and frame annotation creation are complete.
- The exported CSV or JSON has non-zero annotation rows.
- Every `frame_relative_path` resolves under the exported `frames/` directory
  when frame files are needed.
- The dataset type matches the model path: image multilabel training only uses
  `AIDataSet` rows with `dataset_type=image`.
