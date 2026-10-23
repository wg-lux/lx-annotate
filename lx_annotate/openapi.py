"""Explicit schema contracts for routes shared by collection and detail views."""

from __future__ import annotations

from typing import cast

from drf_spectacular.openapi import AutoSchema
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, _SerializerType
from pydantic import BaseModel


class ApplicationAutoSchema(AutoSchema):
    def get_request_serializer(self):
        from lx_dtypes.models.contracts.examination_revision import (
            CaseExaminationSelection,
            CaseStudyExportSelection,
            ExaminationRevisionCreate,
            ExaminationRevisionUpdate,
            ExaminationRevisionVersion,
        )
        from lx_dtypes.models.ledger.medical.Write import (
            PatientMedicalLedgerCreate,
            PatientMedicationCreate,
            PatientMedicationUpdate,
        )

        action = getattr(self.view, "action", "")
        contracts: dict[str, type[BaseModel]] = {}
        if self.path.startswith("/examination-revisions/"):
            contracts = {
                "create": ExaminationRevisionCreate,
                "update": ExaminationRevisionUpdate,
                "destroy": ExaminationRevisionVersion,
                "finalize": ExaminationRevisionVersion,
            }
        elif self.path.startswith("/cases/"):
            contracts = {
                "select_examination": CaseExaminationSelection,
                "research_study_export": CaseStudyExportSelection,
            }
        elif self.path.startswith("/patients/"):
            contracts = {
                "medical_ledger": PatientMedicalLedgerCreate,
                "create_medication": PatientMedicationCreate,
                "update_medication": PatientMedicationUpdate,
            }
        if action in contracts:
            return cast(_SerializerType, contracts[action])
        return super().get_request_serializer()

    def get_response_serializers(self):
        from lx_dtypes.models.contracts.examination_revision import (
            CaseExaminationSelectionRead,
            ExaminationRevisionRead,
        )
        from lx_dtypes.models.contracts.reference_catalog import ReferenceCatalogPayload
        from lx_dtypes.models.ledger.medical import (
            PatientMedicalLedger,
            PatientMedication,
        )

        if self.path.startswith("/examination-revisions/"):
            return cast(_SerializerType, ExaminationRevisionRead)
        if self.path.startswith("/cases/"):
            action = getattr(self.view, "action", "")
            if action == "select_examination":
                schema = CaseExaminationSelectionRead.model_json_schema()
                return cast(
                    _SerializerType,
                    {
                        200: {"type": "array", "items": schema}
                        if self.method == "GET"
                        else schema
                    },
                )
            if action in {"research_export", "research_study_export"}:
                return cast(
                    _SerializerType,
                    {
                        (200, "application/json"): OpenApiTypes.OBJECT,
                        (
                            200,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        ): OpenApiTypes.BINARY,
                    },
                )
        if self.path.startswith("/patients/"):
            contracts = {
                "medical_ledger": PatientMedicalLedger,
                "medical_terminology": ReferenceCatalogPayload,
                "create_medication": PatientMedication,
                "update_medication": PatientMedication,
            }
            contract = contracts.get(getattr(self.view, "action", ""))
            if contract is not None:
                return cast(_SerializerType, contract)
        return super().get_response_serializers()

    # Keep detail identifiers stable; distinguish collections and compatibility
    # routes before spectacular's order-dependent collision suffixing runs.
    operation_ids = {
        ("/media/studies/", "GET"): "media_studies_list",
        (
            "/media-management/force-remove/{file_id}/",
            "DELETE",
        ): "media_management_force_remove_legacy_destroy",
        ("/media/pdfs/", "GET"): "media_pdfs_list",
        ("/media/pdfs/", "PATCH"): "media_pdfs_collection_partial_update",
        ("/media/pdfs/", "DELETE"): "media_pdfs_collection_destroy",
        (
            "/media/pdfs/sensitive-metadata/",
            "GET",
        ): "media_pdfs_sensitive_metadata_list",
        ("/media/studies/table-mappings/", "GET"): "media_studies_table_mappings_list",
        ("/media/videos/", "GET"): "media_videos_list",
        (
            "/media/videos/ensure-prediction-segment-annotations/",
            "POST",
        ): "media_videos_ensure_prediction_segment_annotations_bulk_create",
        (
            "/media/videos/ensure-segment-annotations/",
            "POST",
        ): "media_videos_ensure_segment_annotations_bulk_create",
        ("/media/videos/{id}/segments/", "GET"): "media_videos_segments_list",
        (
            "/settings/application/model_training/runs/",
            "GET",
        ): "settings_application_model_training_runs_list",
        (
            "/settings/application/network_nodes/",
            "GET",
        ): "settings_application_network_nodes_list",
    }

    def get_operation_id(self) -> str:
        return (
            self.operation_ids.get((self.path, self.method))
            or super().get_operation_id()
        )

    def _is_create_operation(self) -> bool:
        if self.path == "/media/videos/masks/" and self.method == "POST":
            return True
        return super()._is_create_operation()

    def get_override_parameters(self) -> list[OpenApiParameter | _SerializerType]:
        from endoreg_db.views.patient.patient import PatientViewSet

        if self.path.startswith("/examination-revisions/"):
            return (
                [OpenApiParameter("id", int, OpenApiParameter.PATH)]
                if "{id}" in self.path
                else [
                    OpenApiParameter(
                        "patient_examination_id",
                        int,
                        OpenApiParameter.QUERY,
                        required=True,
                    )
                ]
            )
        if isinstance(self.view, PatientViewSet):
            return [
                OpenApiParameter(name, int, OpenApiParameter.PATH)
                for name in ("medication_id", "schedule_id")
                if "{" + name + "}" in self.path
            ]
        return super().get_override_parameters()
