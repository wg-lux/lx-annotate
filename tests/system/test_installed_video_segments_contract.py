"""Exercise the installed contract with ranges persisted through JSONField."""

from __future__ import annotations

import json

import pytest
from endoreg_db.models import VideoFile
from lx_dtypes.models.contracts import ValidationError, validate_video_segments_payload


def test_saved_video_sequences_can_be_validated_again() -> None:
    sequences = {"instrument": [(12, 34), (56, 78)], "outside": []}

    # JSONField reloads tuples as lists before VideoFile.save validates them.
    reloaded = json.loads(json.dumps(sequences))
    validated = validate_video_segments_payload(reloaded)

    assert validated.as_dict == sequences
    assert (
        validate_video_segments_payload(
            json.loads(json.dumps(validated.as_dict))
        ).as_dict
        == sequences
    )


def test_installed_video_model_accepts_reloaded_json_sequences() -> None:
    sequences = {"instrument": [[12, 34], [56, 78]], "outside": []}
    video = VideoFile(sequences=sequences)

    video.clean()
    video.sequences = json.loads(json.dumps(video.sequences))
    video.clean()

    assert video.sequences == sequences


@pytest.mark.parametrize("coordinates", [[12], [12, 34, 56], [12.5, 34], [True, 34]])
def test_saved_video_sequences_reject_invalid_coordinates(
    coordinates: list[object],
) -> None:
    with pytest.raises(ValidationError):
        validate_video_segments_payload({"instrument": [coordinates]})
