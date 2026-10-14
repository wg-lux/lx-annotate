"""Authenticated dataset CRUD and explicit relation transformations."""

from __future__ import annotations

from typing import cast

from django.contrib.auth.models import User
from django.core.signing import BadSignature
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from endoreg_db.models.aidataset.aidataset import AIDataSet
from endoreg_db.views.media.table_mappings import TableImportPermission
from lx_dtypes.models.contracts.dataset_lifecycle import (
    DatasetCombine,
    DatasetCreate,
    DatasetDelete,
    DatasetDetails,
    DatasetSplit,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.services.dataset_lifecycle import (
    combine_datasets,
    dataset_response,
    delete_dataset,
    deletion_preview,
    require_dataset_access,
    split_dataset,
    update_dataset,
)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def datasets(request: Request) -> Response:
    user = cast(User, request.user)
    if request.method == "POST":
        try:
            command = DatasetCreate.model_validate(request.data)
        except ValueError:
            return Response({"detail": "Invalid dataset definition"}, status=400)
        dataset = AIDataSet.objects.create(owner=user, **command.model_dump())
        return Response(dataset_response(dataset), status=201)
    visible: list[dict[str, object]] = []
    for dataset in AIDataSet.objects.order_by("name", "pk"):
        try:
            require_dataset_access(user, dataset)
        except PermissionDenied:
            continue
        visible.append(dataset_response(dataset))
    return Response(visible)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated, TableImportPermission])
def dataset_detail(request: Request, dataset_id: int) -> Response:
    dataset = get_object_or_404(AIDataSet, pk=dataset_id)
    user = cast(User, request.user)
    require_dataset_access(user, dataset, write=request.method != "GET")
    try:
        if request.method == "PUT":
            dataset = update_dataset(
                user, dataset_id, DatasetDetails.model_validate(request.data)
            )
        elif request.method == "DELETE":
            return Response(
                delete_dataset(
                    user, dataset_id, DatasetDelete.model_validate(request.data)
                )
            )
        return Response(
            dataset_response(
                dataset,
                members=request.method == "GET"
                and request.query_params.get("members") == "true",
            )
        )
    except (ValueError, BadSignature):
        return Response(
            {
                "detail": "Invalid or stale dataset operation. Reload and review its membership and deletion preview."
            },
            status=400,
        )
    except ProtectedError:
        return Response(
            {"detail": "Dataset is protected by another workflow."}, status=409
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, TableImportPermission])
def dataset_deletion_preview(request: Request, dataset_id: int) -> Response:
    dataset = get_object_or_404(AIDataSet, pk=dataset_id)
    try:
        return Response(deletion_preview(cast(User, request.user), dataset))
    except ValueError:
        return Response(
            {"detail": "Dataset clinical ownership cannot be verified."}, status=409
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def dataset_combine(request: Request) -> Response:
    try:
        dataset = combine_datasets(
            cast(User, request.user), DatasetCombine.model_validate(request.data)
        )
        return Response(dataset_response(dataset), status=201)
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def dataset_split(request: Request, dataset_id: int) -> Response:
    get_object_or_404(AIDataSet, pk=dataset_id)
    try:
        result = split_dataset(
            cast(User, request.user),
            dataset_id,
            DatasetSplit.model_validate(request.data),
        )
        return Response([dataset_response(dataset) for dataset in result], status=201)
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)
