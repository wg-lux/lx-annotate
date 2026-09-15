"""Authenticated, center-scoped split plan creation and inspection."""

from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from endoreg_db.models import AIDataSet, VideoFile
from endoreg_db.services.center_access import resolve_allowed_center_ids
from pydantic import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from lx_annotate.models import AIDatasetSplitPlan
from lx_annotate.schemas.ai_dataset_splits import SplitConfig, SplitSnapshot
from lx_annotate.services.ai_dataset_splits import (
    build_snapshot,
    collect_membership,
    summarize_snapshot,
)


def require_centers(user, center_ids):
    allowed = resolve_allowed_center_ids(user)
    if allowed is not None and (not allowed or not set(center_ids).issubset(allowed)):
        raise PermissionDenied(
            "The dataset includes data outside your authorized centers."
        )


def require_dataset_access(user, dataset):
    video_ids = set(dataset.image_annotations.values_list("frame__video_id", flat=True))
    video_ids.update(dataset.video_annotations.values_list("video_file_id", flat=True))
    require_centers(
        user,
        VideoFile.objects.filter(pk__in=video_ids).values_list("center_id", flat=True),
    )


def plan_response(plan, user, *, include_membership=False):
    snapshot = SplitSnapshot.model_validate(plan.snapshot)
    require_centers(user, [v.center_id for p in snapshot.patients for v in p.videos])
    # Recheck current ownership as well as ownership recorded at creation.
    video_ids = [v.video_id for p in snapshot.patients for v in p.videos]
    require_centers(
        user,
        VideoFile.objects.filter(pk__in=video_ids).values_list("center_id", flat=True),
    )
    result = {
        "id": plan.pk,
        "dataset_id": plan.dataset_id,
        "created_at": plan.created_at.isoformat(),
        **summarize_snapshot(snapshot),
    }
    if include_membership:
        result["membership"] = snapshot.model_dump(mode="json")
    return result


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def dataset_split_plans(request, dataset_id):
    dataset = get_object_or_404(AIDataSet, pk=dataset_id)
    require_dataset_access(request.user, dataset)
    if request.method == "GET":
        plans = AIDatasetSplitPlan.objects.filter(dataset=dataset)
        return Response([plan_response(plan, request.user) for plan in plans])
    try:
        config = SplitConfig.model_validate(request.data)
    except ValidationError:
        return Response(
            {
                "detail": "Provide a name, k (2–20), test_percent (1–50), and integer seed (0–2147483647)."
            },
            status=400,
        )
    try:
        with transaction.atomic():
            dataset = AIDataSet.objects.select_for_update().get(pk=dataset_id)
            membership = collect_membership(dataset)
            require_centers(
                request.user,
                [v.center_id for videos in membership.values() for v in videos],
            )
            snapshot = build_snapshot(config, membership)
            plan = AIDatasetSplitPlan.objects.create(
                dataset=dataset,
                created_by=request.user,
                snapshot=snapshot.model_dump(mode="json"),
            )
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)
    return Response(plan_response(plan, request.user), status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dataset_split_plan_detail(request, dataset_id, plan_id):
    plan = get_object_or_404(AIDatasetSplitPlan, pk=plan_id, dataset_id=dataset_id)
    require_dataset_access(request.user, plan.dataset)
    return Response(plan_response(plan, request.user, include_membership=True))
