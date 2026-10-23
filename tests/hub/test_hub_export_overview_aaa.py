from __future__ import annotations

from typing import Any, cast
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import resolve
from endoreg_db.models import Center, PortalUserInfo

from lx_annotate.views.hub_export import (
    hub_export_mark,
    hub_export_offload_eligible_videos,
    hub_export_overview,
    hub_export_retry,
    hub_export_unmark,
)

User = cast(Any, get_user_model())


class HubExportOverviewRouteAAATests(TestCase):
    def test_api_routes_resolve_to_the_canonical_hub_export_views(self) -> None:
        # Arrange
        cases = {
            "/api/hub-export/overview/": hub_export_overview,
            "/api/hub-export/mark/": hub_export_mark,
            "/api/hub-export/offload-eligible-videos/": (
                hub_export_offload_eligible_videos
            ),
            "/api/hub-export/unmark/": hub_export_unmark,
            "/api/hub-export/jobs/11111111-1111-1111-1111-111111111111/retry/": (
                hub_export_retry
            ),
        }

        # Act
        resolved = {path: resolve(path).func for path in cases}

        # Assert
        assert resolved == cases

    @patch("lx_annotate.views.hub_export.build_hub_export_overview")
    @patch("lx_annotate.views.hub_export.resolve_target_hub_node")
    def test_overview_route_delegates_selected_target_to_typed_builder(
        self,
        resolve_target,
        build_overview,
    ) -> None:
        # Arrange
        operator = User.objects.create_user(username="overview-operator")
        operator.groups.add(Group.objects.get_or_create(name="data:read")[0])
        center = Center.objects.create(
            name="overview-center", center_key="overview-center"
        )
        PortalUserInfo.objects.get_or_create(user=operator)[0].centers.add(center)
        self.client.force_login(operator)
        target = object()
        payload = {
            "selected_target_node_key": "hub-1",
            "source_node_key": "site-1",
            "hub_nodes": [],
            "config_ready": False,
            "config_error": "test configuration",
            "privacy_summary": {
                "min_k": 5,
                "eligible_resource_count": 0,
                "eligible_case_count": 0,
                "marked_resource_count": 0,
                "smallest_equivalence_class_size": None,
                "violating_equivalence_class_count": 0,
                "passes_k_anonymity": False,
                "status": "unavailable",
            },
            "sync_summary": {
                "centers": [],
                "rejections": [],
                "duplicates": [],
                "processed_file_count": 0,
                "candidate_count": 0,
            },
            "items": [],
        }
        resolve_target.return_value = target
        build_overview.return_value = payload

        # Act
        response = self.client.get(
            "/api/hub-export/overview/",
            {"target_node_key": "hub-1"},
        )

        # Assert
        assert response.status_code == 200
        resolve_target.assert_called_once_with(target_node_key="hub-1")
        build_overview.assert_called_once_with(
            target_node=target, allowed_center_ids=frozenset({center.pk})
        )
        assert response.json() == payload

    @patch("lx_annotate.views.hub_export.build_hub_export_overview")
    def test_overview_route_requires_an_authenticated_operator(
        self,
        build_overview,
    ) -> None:
        # Arrange
        build_overview.return_value = {}

        # Act
        response = self.client.get("/api/hub-export/overview/")

        # Assert
        assert response.status_code in {401, 403}
        build_overview.assert_not_called()
