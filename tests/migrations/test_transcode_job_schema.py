"""The initial transcode schema and current model expose replacement only."""

from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError
from django.db.migrations.loader import MigrationLoader
from django.test import override_settings

from lx_annotate.models import VideoTranscodeJob


def test_current_model_rejects_playback_copy() -> None:
    field = VideoTranscodeJob._meta.get_field("option")
    field.clean("replace_processed", None)
    with pytest.raises(ValidationError, match="playback_copy"):
        field.clean("playback_copy", None)


@override_settings(MIGRATION_MODULES={})
def test_migration_state_matches_replacement_only_model() -> None:
    loader = MigrationLoader(None)
    state = loader.project_state([("lx_annotate", "0009_videotranscodejob")])
    historical_model = state.apps.get_model("lx_annotate", "VideoTranscodeJob")
    field = historical_model._meta.get_field("option")
    assert field.choices == VideoTranscodeJob._meta.get_field("option").choices
    with pytest.raises(ValidationError, match="playback_copy"):
        field.clean("playback_copy", None)
