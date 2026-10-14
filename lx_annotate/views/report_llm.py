"""Authenticated status and graph-to-report endpoints; never persist generated reports."""

from __future__ import annotations

from io import BytesIO

from django.shortcuts import get_object_or_404
from django.views.decorators.cache import never_cache
from endoreg_db.models import PatientExamination
from endoreg_db.services.centers.access import resolve_allowed_center_ids
from ninja.errors import HttpError
from pydantic import ValidationError
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.exceptions import APIException
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.services.report_llm import (
    PROMPT_VERSION,
    GenerateReportRequest,
    ReportLlmError,
    build_messages,
    check_model,
    generate_report,
    llm_config,
    resolve_graph,
)

REPORT_REQUEST_MAX_BYTES = 1_000_000


class ReportRequestTooLarge(APIException):
    status_code = 413
    default_code = "input_too_large"

    def __init__(self):
        # Keep the reporting error envelope even if CSRF triggers parsing
        # before the view runs. In particular, ready must remain a boolean.
        self.detail = {
            "ready": False,
            "code": self.default_code,
            "detail": "Die Anfrage ist zu groß.",
        }


class ReportJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        # Read at most one byte beyond the limit, without trusting Content-Length.
        body = stream.read(REPORT_REQUEST_MAX_BYTES + 1)
        if len(body) > REPORT_REQUEST_MAX_BYTES:
            raise ReportRequestTooLarge()
        return super().parse(BytesIO(body), media_type, parser_context)


def error_response(error: ReportLlmError) -> Response:
    return Response(
        {"ready": False, "code": error.code, "detail": error.detail},
        status=error.status,
        headers={"Cache-Control": "no-store"},
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_llm_status(request: Request) -> Response:
    try:
        config = llm_config()
        check_model(config)
    except ReportLlmError as error:
        return error_response(error)
    return Response(
        {"ready": True, "model": config.model}, headers={"Cache-Control": "no-store"}
    )


@never_cache
@api_view(["POST"])
@parser_classes([ReportJSONParser])
@permission_classes([IsAuthenticated])
def report_llm_generate(request: Request) -> Response:
    try:
        # SessionAuthentication's CSRF check may already have parsed this data.
        data = GenerateReportRequest.model_validate(request.data)
    except ValidationError:
        return error_response(
            ReportLlmError("invalid_input", "Ungültiger Untersuchungskontext.", 400)
        )
    queryset = PatientExamination.objects.select_related("patient", "examination")
    allowed = resolve_allowed_center_ids(request.user)
    if allowed is not None:
        queryset = queryset.filter(patient__center_id__in=allowed)
    examination = get_object_or_404(queryset, pk=data.patient_examination_id)
    identity = data.graph.identity
    if (
        examination.examination is None
        or examination.knowledge_base_module != identity.knowledge_base_module
        or examination.knowledge_base_version != identity.knowledge_base_version
        or examination.examination.name != data.graph.examination_name
    ):
        return error_response(
            ReportLlmError(
                "context_mismatch",
                "Untersuchung und Terminologiegraph stimmen nicht überein.",
                409,
            )
        )
    try:
        config = llm_config()
        # Recheck on POST as well: availability can change after the frontend preflight.
        check_model(config)
        graph = resolve_graph(data.graph)
        text = generate_report(config, build_messages(data, graph))
    except ReportLlmError as error:
        return error_response(error)
    except (HttpError, ValueError, KeyError):
        return error_response(
            ReportLlmError(
                "invalid_graph",
                "Der Terminologiegraph konnte nicht verifiziert werden.",
                409,
            )
        )
    return Response(
        {
            "text": text,
            "model": config.model,
            "prompt_version": PROMPT_VERSION,
            "graph_context_id": graph.context_id,
        },
        headers={"Cache-Control": "no-store"},
    )
