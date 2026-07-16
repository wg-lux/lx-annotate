from __future__ import annotations

from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from endoreg_db.models import Center, NetworkNode


class HubExportRecoveryCommandTests(TestCase):
    def test_dispatches_recovery_for_the_single_active_site_node(self) -> None:
        center = Center.objects.create(name="Site", center_key="site")
        NetworkNode.objects.create(
            display_name="Site node",
            node_key="site-node",
            role=NetworkNode.Role.SITE_NODE,
            owning_center=center,
        )
        stdout = StringIO()

        with patch(
            "lx_annotate.tasks.recover_stale_outbound_hub_transfer_jobs_task.delay"
        ) as delay:
            call_command("dispatch_hub_export_recovery", stdout=stdout)

        delay.assert_called_once_with("site-node")
        self.assertIn(
            "Dispatched stale outbound hub transfer recovery", stdout.getvalue()
        )
