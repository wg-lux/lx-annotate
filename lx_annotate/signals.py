from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from endoreg_db.models import RawPdfState, VideoState

from .hub.hub_export_state import (
    sync_outbound_jobs_for_report,
    sync_outbound_jobs_for_video,
)


@receiver(post_save, sender=VideoState)
def sync_video_hub_export_state(sender, instance: VideoState, **kwargs) -> None:  # noqa: ARG001
    video = getattr(instance, "video_file", None)
    if video is not None:
        sync_outbound_jobs_for_video(video)


@receiver(post_save, sender=RawPdfState)
def sync_report_hub_export_state(sender, instance: RawPdfState, **kwargs) -> None:  # noqa: ARG001
    report = getattr(instance, "raw_pdf_file", None)
    if report is not None:
        sync_outbound_jobs_for_report(report)
