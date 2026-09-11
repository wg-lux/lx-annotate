from __future__ import annotations

from django.urls import include, path

from lx_annotate.views.administration import (
    administration_overview,
    center_scope_assignment,
    center_scope_users,
    storage_artifact_stream,
    storage_balance_work_cancel,
    storage_balancing_action,
    storage_operator_control,
    storage_placement_preview,
)
from lx_annotate.views.ai_dataset_splits import (
    dataset_split_plan_detail,
    dataset_split_plans,
)
from lx_annotate.views.anonymization_overview import (
    LifecycleAnonymizationOverviewView,
    LifecycleUploadJobDismissView,
    LifecycleUploadJobRetryView,
)
from lx_annotate.views.application_settings import primary_annotation_settings_detail
from lx_annotate.views.frame_annotation import BoundedDecodedFrameStreamView
from lx_annotate.views.hub_export import (
    hub_export_mark,
    hub_export_offload_eligible_videos,
    hub_export_overview,
    hub_export_retry,
    hub_export_unmark,
)
from lx_annotate.views.monitoring import monitoring_snapshot
from lx_annotate.views.quarantine import quarantine_overview
from lx_annotate.views.report_llm import report_llm_generate, report_llm_status
from lx_annotate.views.study_export import study_export_options, study_export_xlsx
from lx_annotate.views.video_state_repair import VideoStateRepairView

urlpatterns = [
    path(
        "settings/application/ai_datasets/<int:dataset_id>/split_plans/",
        dataset_split_plans,
        name="ai-dataset-split-plans",
    ),
    path(
        "settings/application/ai_datasets/<int:dataset_id>/split_plans/<int:plan_id>/",
        dataset_split_plan_detail,
        name="ai-dataset-split-plan-detail",
    ),
    path(
        "administration/monitoring/",
        monitoring_snapshot,
        name="administration-monitoring",
    ),
    path("reporting/llm/status/", report_llm_status, name="report-llm-status"),
    path("reporting/llm/generate/", report_llm_generate, name="report-llm-generate"),
    path(
        "anonymization/upload-jobs/<uuid:job_id>/dismiss/",
        LifecycleUploadJobDismissView.as_view(),
        name="anonymization_upload_job_dismiss",
    ),
    path(
        "anonymization/items/overview/",
        LifecycleAnonymizationOverviewView.as_view(),
        name="anonymization_items_overview",
    ),
    path(
        "anonymization/upload-jobs/<uuid:job_id>/retry/",
        LifecycleUploadJobRetryView.as_view(),
        name="anonymization_upload_job_retry",
    ),
    path(
        "runtime/videos/repair/",
        VideoStateRepairView.as_view(),
        name="runtime-video-state-repair-all",
    ),
    path(
        "runtime/videos/<int:pk>/repair/",
        VideoStateRepairView.as_view(),
        name="runtime-video-state-repair",
    ),
    path(
        "media/studies/case-export/options/",
        study_export_options,
        name="study-case-export-options",
    ),
    path(
        "media/studies/case-export.xlsx",
        study_export_xlsx,
        name="study-case-export-xlsx",
    ),
    path(
        "settings/application/",
        primary_annotation_settings_detail,
        name="primary-annotation-settings-detail",
    ),
    path(
        "media/videos/<int:video_id>/frames/<int:frame_number>/decoded-stream/",
        BoundedDecodedFrameStreamView.as_view(),
        name="bounded-decoded-frame-stream",
    ),
    path(
        "administration/overview/",
        administration_overview,
        name="administration-overview",
    ),
    path(
        "administration/center-scopes/",
        center_scope_users,
        name="center-scope-users",
    ),
    path(
        "administration/storage-balancing/actions/",
        storage_balancing_action,
        name="storage-balancing-action",
    ),
    path(
        "administration/storage-balancing/placement-preview/",
        storage_placement_preview,
        name="storage-placement-preview",
    ),
    path(
        "administration/storage-balancing/work-items/<uuid:work_item_id>/cancel/",
        storage_balance_work_cancel,
        name="storage-balance-work-cancel",
    ),
    path(
        "administration/storage-balancing/operator-controls/",
        storage_operator_control,
        name="storage-operator-control",
    ),
    path(
        "administration/storage-artifacts/<uuid:placement_id>/stream/",
        storage_artifact_stream,
        name="storage-artifact-stream",
    ),
    path(
        "administration/center-scopes/<int:user_id>/",
        center_scope_assignment,
        name="center-scope-assignment",
    ),
    path("hub-export/overview/", hub_export_overview, name="hub-export-overview"),
    path("hub-export/mark/", hub_export_mark, name="hub-export-mark"),
    path(
        "hub-export/offload-eligible-videos/",
        hub_export_offload_eligible_videos,
        name="hub-export-offload-eligible-videos",
    ),
    path("hub-export/unmark/", hub_export_unmark, name="hub-export-unmark"),
    path(
        "hub-export/jobs/<uuid:outbound_job_id>/retry/",
        hub_export_retry,
        name="hub-export-retry",
    ),
    path(
        "runtime/quarantine/",
        quarantine_overview,
        name="runtime-quarantine-overview",
    ),
    path("", include(("endoreg_db.urls", "endoreg_db"), namespace="api")),
]
