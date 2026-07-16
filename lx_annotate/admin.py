from django.contrib import admin

from .models import OutboundHubTransferJob


@admin.register(OutboundHubTransferJob)
class OutboundHubTransferJobAdmin(admin.ModelAdmin):
    list_display = (
        "transfer_key",
        "resource_kind",
        "local_status",
        "local_cleanup_status",
        "target_node",
        "source_center",
        "marked_at",
        "completed_at",
    )
    list_filter = (
        "resource_kind",
        "local_status",
        "local_cleanup_policy",
        "local_cleanup_status",
        "transfer_mode",
        "target_node",
    )
    search_fields = ("transfer_key", "remote_transfer_id", "last_error")
