from __future__ import annotations

from django.db import migrations


def move_legacy_video_links(apps, schema_editor) -> None:
    PatientExamination = apps.get_model("endoreg_db", "PatientExamination")
    VideoFile = apps.get_model("endoreg_db", "VideoFile")
    database_alias = schema_editor.connection.alias

    legacy_links = (
        PatientExamination.objects.using(database_alias)
        .exclude(video_id=None)
        .values_list("id", "video_id")
    )
    for patient_examination_id, video_id in legacy_links.iterator():
        video = VideoFile.objects.using(database_alias).get(pk=video_id)
        if (
            video.examination_id is not None
            and video.examination_id != patient_examination_id
        ):
            raise RuntimeError(
                "Conflicting PatientExamination.video and "
                "VideoFile.examination links prevent safe migration."
            )
        if video.examination_id is None:
            VideoFile.objects.using(database_alias).filter(pk=video_id).update(
                examination_id=patient_examination_id
            )


def restore_unambiguous_legacy_video_links(apps, schema_editor) -> None:
    PatientExamination = apps.get_model("endoreg_db", "PatientExamination")
    VideoFile = apps.get_model("endoreg_db", "VideoFile")
    database_alias = schema_editor.connection.alias

    patient_examinations = PatientExamination.objects.using(database_alias).all()
    for patient_examination in patient_examinations.iterator():
        video_ids = list(
            VideoFile.objects.using(database_alias)
            .filter(examination_id=patient_examination.pk)
            .values_list("id", flat=True)[:2]
        )
        if len(video_ids) == 1:
            PatientExamination.objects.using(database_alias).filter(
                pk=patient_examination.pk
            ).update(video_id=video_ids[0])


class Migration(migrations.Migration):
    dependencies = [
        ("endoreg_db", "0036_alter_videohlsartifact_error_code"),
    ]

    operations = [
        migrations.RunPython(
            move_legacy_video_links,
            restore_unambiguous_legacy_video_links,
        ),
        migrations.RemoveField(
            model_name="patientexamination",
            name="video",
        ),
    ]
