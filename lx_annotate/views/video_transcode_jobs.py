"""Center-scoped, bounded transcode admission and authoritative job observation."""

from __future__ import annotations

from endoreg_db.models import VideoFile
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from lx_annotate.models import VideoTranscodeJob
from lx_annotate.permissions import LifecyclePolicyPermission, lifecycle_center_ids
from lx_annotate.services.video_transcode_jobs import (
    OPTIONS,
    TranscodeSubmissionError,
    serialize_job,
    submit_video_transcode,
    transcode_runtime,
    video_is_transcodable,
)


class TranscodeSubmissionSerializer(serializers.Serializer):
    option = serializers.ChoiceField(choices=OPTIONS)
    idempotency_key = serializers.UUIDField()


class VideoTranscodeJobsView(APIView):
    permission_classes = [IsAuthenticated, LifecyclePolicyPermission]

    def videos(self, request, pk):
        videos = VideoFile.objects.order_by("pk")
        center_ids = lifecycle_center_ids(request.user)
        if center_ids is not None:
            videos = videos.filter(center_id__in=center_ids)
        if pk is not None:
            videos = videos.filter(pk=pk)
        return videos

    def get(self, request, pk=None):
        if set(request.query_params) - {"limit"}:
            return Response(
                {"code": "invalid_query", "detail": "Only limit is supported."},
                status=400,
            )
        try:
            limit = int(request.query_params.get("limit", 100))
            if not 1 <= limit <= 200:
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {"code": "invalid_limit", "detail": "Limit must be between 1 and 200."},
                status=400,
            )
        videos = self.videos(request, pk)
        if pk is not None and not videos.exists():
            return Response({"detail": "Video not found."}, status=404)
        try:
            transcode_runtime()
            candidates = [
                {
                    "video_id": video.pk,
                    "filename": video.original_file_name or "",
                    "options": list(OPTIONS),
                }
                for video in videos.exclude(processed_file="").exclude(
                    processed_video_hash=""
                )[:limit]
                if video_is_transcodable(video)
            ]
        except TranscodeSubmissionError as exc:
            return Response(
                {
                    "code": exc.code,
                    "detail": "Installed media dependencies do not support safe transcoding.",
                },
                status=exc.status,
            )
        except OSError:
            return Response(
                {
                    "code": "processed_storage_unavailable",
                    "detail": "Processed storage is unavailable.",
                },
                status=503,
            )
        jobs = VideoTranscodeJob.objects.filter(video__in=videos).order_by(
            "-created_at", "-pk"
        )[:limit]
        return Response(
            {
                "jobs": [serialize_job(job) for job in jobs],
                "candidates": candidates,
                "options": list(OPTIONS),
            },
            headers={"Cache-Control": "private, no-store"},
        )

    def post(self, request, pk=None):
        if pk is None:
            return Response({"detail": "A video ID is required."}, status=405)
        if not isinstance(request.data, dict) or set(request.data) != {
            "option",
            "idempotency_key",
        }:
            return Response(
                {
                    "code": "invalid_payload",
                    "detail": "Provide option and idempotency_key.",
                },
                status=400,
            )
        payload = TranscodeSubmissionSerializer(data=request.data)
        if not payload.is_valid():
            return Response(
                {"code": "invalid_payload", "detail": payload.errors}, status=400
            )
        key = payload.validated_data["idempotency_key"]
        video = self.videos(request, pk).first()
        if video is None:
            return Response({"detail": "Video not found."}, status=404)
        try:
            job, created = submit_video_transcode(
                video=video,
                actor=request.user,
                option=payload.validated_data["option"],
                idempotency_key=key,
            )
        except TranscodeSubmissionError as exc:
            return Response(
                {
                    "code": exc.code,
                    "detail": "Transcode admission rejected: " + exc.code,
                },
                status=exc.status,
            )
        except OSError:
            return Response(
                {
                    "code": "processed_storage_unavailable",
                    "detail": "Processed storage is unavailable.",
                },
                status=503,
            )
        return Response(
            {"job": serialize_job(job), "created": created},
            status=202 if created else 200,
        )
