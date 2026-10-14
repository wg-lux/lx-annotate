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
    lifecycle_upload_job_cancel,
)
from lx_annotate.views.anonymization_storage import anonymization_storage
from lx_annotate.views.application_settings import primary_annotation_settings_detail
from lx_annotate.views.dataset_lifecycle import (
    dataset_combine,
    dataset_deletion_preview,
    dataset_detail,
    dataset_split,
    datasets,
)
from lx_annotate.views.frame_annotation import BoundedDecodedFrameStreamView
from lx_annotate.views.hub_export import (
    hub_export_mark,
    hub_export_preflight,
    hub_export_inspect_recovery,
    hub_export_restart_cleanup,
    hub_export_offload_eligible_videos,
    hub_export_overview,
    hub_export_retry,
    hub_export_unmark,
)
from lx_annotate.views.monitoring import monitoring_snapshot
from lx_annotate.views.quarantine import quarantine_overview
from lx_annotate.views.report_llm import report_llm_generate, report_llm_status
from lx_annotate.views.storage_monitor import storage_monitor
from lx_annotate.views.study_cohorts import (
    dataset_study_cohorts,
    study_cohort_definition,
    study_cohort_detail,
    study_cohort_preview,
    study_cohorts,
)
from lx_annotate.views.study_export import study_export_options, study_export_xlsx
from lx_annotate.views.study_setup_import import study_setup_import
from lx_annotate.views.study_table_import import study_table_import
from lx_annotate.views.video_state_repair import VideoStateRepairView
from lx_annotate.views.video_transcode_jobs import VideoTranscodeJobsView

urlpatterns = [
    path("media/studies/setup-import/", study_setup_import, name="study-setup-import"),
    path("media/studies/datasets/", datasets, name="study-datasets"),
    path(
        "media/studies/datasets/combine/",
        dataset_combine,
        name="study-datasets-combine",
    ),
    path(
        "media/studies/datasets/<int:dataset_id>/",
        dataset_detail,
        name="study-dataset-detail",
    ),
    path(
        "media/studies/datasets/<int:dataset_id>/deletion-preview/",
        dataset_deletion_preview,
        name="study-dataset-deletion-preview",
    ),
    path(
        "media/studies/datasets/<int:dataset_id>/split/",
        dataset_split,
        name="study-dataset-split",
    ),
    path("media/storage-monitor/", storage_monitor, name="storage-monitor"),
    path("media/studies/cohorts/", study_cohorts, name="study-cohorts"),
    path(
        "media/studies/cohorts/<int:cohort_id>/table-import/",
        study_table_import,
        name="study-table-import",
    ),
    path(
        "media/studies/cohorts/<int:cohort_id>/definition/",
        study_cohort_definition,
        name="study-cohort-definition",
    ),
    path(
        "media/studies/cohorts/preview/",
        study_cohort_preview,
        name="saved-study-cohort-preview",
    ),
    path(
        "media/studies/cohorts/<int:cohort_id>/",
        study_cohort_detail,
        name="study-cohort-detail",
    ),
    path(
        "settings/application/ai_datasets/<int:dataset_id>/study_cohorts/",
        dataset_study_cohorts,
        name="dataset-study-cohorts",
    ),
    path(
        "media/videos/transcode-jobs/",
        VideoTranscodeJobsView.as_view(),
        name="video-transcode-job-overview",
    ),
    path(
        "media/videos/<int:pk>/transcode-jobs/",
        VideoTranscodeJobsView.as_view(),
        name="video-transcode-jobs",
    ),
    path(
        "anonymization/upload-jobs/<uuid:job_id>/cancel/",
        lifecycle_upload_job_cancel,
        name="anonymization_upload_job_cancel",
    ),
    path(
        "anonymization/storage/",
        anonymization_storage,
        name="anonymization-storage",
    ),
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
    path(
        "hub-export/videos/<int:video_id>/preflight/",
        hub_export_preflight,
        name="hub-export-preflight",
    ),
    path(
        "hub-export/videos/<int:video_id>/inspect-recovery/",
        hub_export_inspect_recovery,
        name="hub-export-inspect-recovery",
    ),
    path(
        "hub-export/videos/<int:video_id>/restart-cleanup/",
        hub_export_restart_cleanup,
        name="hub-export-restart-cleanup",
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
