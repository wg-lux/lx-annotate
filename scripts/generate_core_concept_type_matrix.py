#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from datetime import UTC, datetime
from typing import Any, Callable, get_type_hints

# Ensure imports resolve both in local dev and CI.
REPO_ROOT = Path(__file__).resolve().parents[1]
LX_DATA_MODELS = REPO_ROOT / "lx-data-models"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(LX_DATA_MODELS) not in sys.path:
    sys.path.insert(0, str(LX_DATA_MODELS))

os.environ.setdefault("ENFORCE_AUTH", "0")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_dev")

import django  # noqa: E402

django.setup()

from lx_dtypes.models.knowledge_base.citation.Citation import Citation  # noqa: E402
from lx_dtypes.models.knowledge_base.citation.CitationDataDict import (  # noqa: E402
    CitationDataDict,
)
from lx_dtypes.models.knowledge_base.citation.CitationDjango import CitationDjango  # noqa: E402
from lx_dtypes.models.knowledge_base.classification.Classification import (  # noqa: E402
    Classification,
)
from lx_dtypes.models.knowledge_base.classification.ClassificationDataDict import (  # noqa: E402
    ClassificationDataDict,
)
from lx_dtypes.models.knowledge_base.classification._ClassificationDjango import (  # noqa: E402
    ClassificationDjango,
)
from lx_dtypes.models.knowledge_base.classification_choice.ClassificationChoice import (  # noqa: E402
    ClassificationChoice,
)
from lx_dtypes.models.knowledge_base.classification_choice.ClassificationChoiceDataDict import (  # noqa: E402
    ClassificationChoiceDataDict,
)
from lx_dtypes.models.knowledge_base.classification_choice.ClassificationChoiceDjango import (  # noqa: E402
    ClassificationChoiceDjango,
)
from lx_dtypes.models.knowledge_base.classification_choice_descriptor.ClassificationChoiceDescriptor import (  # noqa: E402
    ClassificationChoiceDescriptor,
)
from lx_dtypes.models.knowledge_base.classification_choice_descriptor.ClassificationChoiceDescriptorDataDict import (  # noqa: E402
    ClassificationChoiceDescriptorDataDict,
)
from lx_dtypes.models.knowledge_base.classification_choice_descriptor.ClassificationChoiceDescriptorDjango import (  # noqa: E402
    ClassificationChoiceDescriptorDjango,
)
from lx_dtypes.models.knowledge_base.examination.Examination import Examination  # noqa: E402
from lx_dtypes.models.knowledge_base.examination.ExaminationDataDict import (  # noqa: E402
    ExaminationDataDict,
)
from lx_dtypes.models.knowledge_base.examination.ExaminationDjango import (  # noqa: E402
    ExaminationDjango,
)
from lx_dtypes.models.knowledge_base.finding.FindingDataDict import FindingDataDict  # noqa: E402
from lx_dtypes.models.knowledge_base.finding.FindingTypeDataDict import (  # noqa: E402
    FindingTypeDataDict,
)
from lx_dtypes.models.knowledge_base.finding._Finding import Finding  # noqa: E402
from lx_dtypes.models.knowledge_base.finding._FindingDjango import FindingDjango  # noqa: E402
from lx_dtypes.models.knowledge_base.finding._FindingType import FindingType  # noqa: E402
from lx_dtypes.models.knowledge_base.finding._FindingTypeDjango import (  # noqa: E402
    FindingTypeDjango,
)
from lx_dtypes.models.knowledge_base.indication.Indication import Indication  # noqa: E402
from lx_dtypes.models.knowledge_base.indication.IndicationDataDict import (  # noqa: E402
    IndicationDataDict,
)
from lx_dtypes.models.knowledge_base.indication.IndicationDjango import (  # noqa: E402
    IndicationDjango,
)
from lx_dtypes.models.knowledge_base.indication.IndicationType import (  # noqa: E402
    IndicationType,
)
from lx_dtypes.models.knowledge_base.indication.IndicationTypeDataDict import (  # noqa: E402
    IndicationTypeDataDict,
)
from lx_dtypes.models.knowledge_base.indication.IndicationTypeDjango import (  # noqa: E402
    IndicationTypeDjango,
)
from lx_dtypes.models.knowledge_base.information_source.InformationSource import (  # noqa: E402
    InformationSource,
)
from lx_dtypes.models.knowledge_base.information_source.InformationSourceDataDict import (  # noqa: E402
    InformationSourceDataDict,
)
from lx_dtypes.models.knowledge_base.information_source.InformationSourceDjango import (  # noqa: E402
    InformationSourceDjango,
)
from lx_dtypes.models.knowledge_base.information_source.InformationSourceType import (  # noqa: E402
    InformationSourceType,
)
from lx_dtypes.models.knowledge_base.information_source.InformationSourceTypeDataDict import (  # noqa: E402
    InformationSourceTypeDataDict,
)
from lx_dtypes.models.knowledge_base.information_source.InformationSourceTypeDjango import (  # noqa: E402
    InformationSourceTypeDjango,
)
from lx_dtypes.models.knowledge_base.intervention.Intervention import (  # noqa: E402
    Intervention,
)
from lx_dtypes.models.knowledge_base.intervention.InterventionDataDict import (  # noqa: E402
    InterventionDataDict,
)
from lx_dtypes.models.knowledge_base.intervention.InterventionDjango import (  # noqa: E402
    InterventionDjango,
)
from lx_dtypes.models.knowledge_base.intervention.InterventionType import (  # noqa: E402
    InterventionType,
)
from lx_dtypes.models.knowledge_base.intervention.InterventionTypeDataDict import (  # noqa: E402
    InterventionTypeDataDict,
)
from lx_dtypes.models.knowledge_base.intervention.InterventionTypeDjango import (  # noqa: E402
    InterventionTypeDjango,
)
from lx_dtypes.models.knowledge_base.unit.Unit import Unit  # noqa: E402
from lx_dtypes.models.knowledge_base.unit.UnitDataDict import UnitDataDict  # noqa: E402
from lx_dtypes.models.knowledge_base.unit.UnitDjango import UnitDjango  # noqa: E402
from lx_dtypes.models.knowledge_base.unit.UnitType import UnitType  # noqa: E402
from lx_dtypes.models.knowledge_base.unit.UnitTypeDataDict import UnitTypeDataDict  # noqa: E402
from lx_dtypes.models.knowledge_base.unit.UnitTypeDjango import UnitTypeDjango  # noqa: E402

ConceptConfig = dict[str, Any]


def _type_to_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    text = str(value)
    return text.replace("typing.", "")


def _parse_ts_interfaces(path: Path) -> dict[str, dict[str, str]]:
    data = path.read_text(encoding="utf-8")
    own_fields: dict[str, dict[str, str]] = {}
    extends_map: dict[str, list[str]] = {}

    interface_pattern = re.compile(
        r"export interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*\{([\s\S]*?)\}\n",
        re.MULTILINE,
    )
    field_pattern = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\??:\s*([^\n]+)", re.MULTILINE)

    for match in interface_pattern.finditer(data):
        name = match.group(1)
        extends_raw = match.group(2) or ""
        body = match.group(3)
        extends_map[name] = [
            item.strip() for item in extends_raw.split(",") if item.strip()
        ]
        fields: dict[str, str] = {}
        for field_match in field_pattern.finditer(body):
            field_name = field_match.group(1)
            field_type = field_match.group(2).strip()
            fields[field_name] = field_type
        own_fields[name] = fields

    resolved: dict[str, dict[str, str]] = {}

    def _resolve(name: str) -> dict[str, str]:
        if name in resolved:
            return resolved[name]
        fields: dict[str, str] = {}
        for base_name in extends_map.get(name, []):
            fields.update(_resolve(base_name))
        fields.update(own_fields.get(name, {}))
        resolved[name] = fields
        return fields

    for interface_name in own_fields:
        _resolve(interface_name)

    return resolved


def _camel_to_snake(name: str) -> str:
    out = []
    for ch in name:
        if ch.isupper():
            out.append("_")
            out.append(ch.lower())
        else:
            out.append(ch)
    return "".join(out).lstrip("_")


def _builders() -> dict[str, Callable[[], Any]]:
    return {
        "Classification": lambda: Classification(
            name="classification_model",
            classification_choices=["choice_1", "choice_2"],
            classification_types=["type_1"],
            tags=["tag_a", "tag_b"],
        ),
        "ClassificationChoice": lambda: ClassificationChoice(
            name="choice_model",
            classification_choice_descriptors=["descriptor_1", "descriptor_2"],
            tags=["tag_a", "tag_b"],
        ),
        "ClassificationChoiceDescriptor": lambda: ClassificationChoiceDescriptor(
            name="descriptor_model",
            classification_choice_descriptor_type="numeric",
            numeric_distribution="uniform",
            unit="mm",
            selection_options=["opt_1", "opt_2"],
            tags=["tag_a", "tag_b"],
        ),
        "Examination": lambda: Examination(
            name="exam_model",
            findings=["finding_1", "finding_2"],
            examination_types=["exam_type_1"],
            indications=["indication_1"],
            tags=["tag_a", "tag_b"],
        ),
        "Finding": lambda: Finding(
            name="finding_model",
            finding_types=["finding_type_1"],
            classifications=["classification_1", "classification_2"],
            interventions=["intervention_1"],
            tags=["tag_a", "tag_b"],
        ),
        "FindingType": lambda: FindingType(name="finding_type_model", tags=["tag_a", "tag_b"]),
        "Indication": lambda: Indication(
            name="indication_model",
            indication_types=["indication_type_1"],
            interventions=["intervention_1", "intervention_2"],
            tags=["tag_a", "tag_b"],
        ),
        "IndicationType": lambda: IndicationType(name="indication_type_model", tags=["tag_a", "tag_b"]),
        "Intervention": lambda: Intervention(
            name="intervention_model",
            intervention_types=["intervention_type_1"],
            tags=["tag_a", "tag_b"],
        ),
        "InterventionType": lambda: InterventionType(
            name="intervention_type_model", tags=["tag_a", "tag_b"]
        ),
        "Unit": lambda: Unit(
            name="unit_model",
            abbreviation="mm",
            unit_types=["unit_type_1"],
            tags=["tag_a", "tag_b"],
        ),
        "UnitType": lambda: UnitType(name="unit_type_model", tags=["tag_a", "tag_b"]),
        "InformationSource": lambda: InformationSource(
            name="source_model",
            information_source_types=["source_type_1"],
            tags=["tag_a", "tag_b"],
        ),
        "InformationSourceType": lambda: InformationSourceType(
            name="source_type_model", tags=["tag_a", "tag_b"]
        ),
        "Citation": lambda: Citation(
            name="citation_model",
            citation_key="citation_key_model",
            title="Citation title",
            authors=["author_a", "author_b"],
            keywords=["kw_a", "kw_b"],
            identifiers={"pmid": "123"},
            tags=["tag_a", "tag_b"],
        ),
    }


def _concepts() -> list[ConceptConfig]:
    return [
        {
            "name": "Classification",
            "model": Classification,
            "ddict": ClassificationDataDict,
            "django": ClassificationDjango,
            "frontend_interface": "ClassificationCore",
        },
        {
            "name": "ClassificationChoice",
            "model": ClassificationChoice,
            "ddict": ClassificationChoiceDataDict,
            "django": ClassificationChoiceDjango,
            "frontend_interface": "ClassificationChoiceCore",
        },
        {
            "name": "ClassificationChoiceDescriptor",
            "model": ClassificationChoiceDescriptor,
            "ddict": ClassificationChoiceDescriptorDataDict,
            "django": ClassificationChoiceDescriptorDjango,
            "frontend_interface": "ClassificationChoiceDescriptorCore",
        },
        {
            "name": "Examination",
            "model": Examination,
            "ddict": ExaminationDataDict,
            "django": ExaminationDjango,
            "frontend_interface": "ExaminationCore",
        },
        {
            "name": "Finding",
            "model": Finding,
            "ddict": FindingDataDict,
            "django": FindingDjango,
            "frontend_interface": "FindingCore",
        },
        {
            "name": "FindingType",
            "model": FindingType,
            "ddict": FindingTypeDataDict,
            "django": FindingTypeDjango,
            "frontend_interface": "FindingTypeCore",
        },
        {
            "name": "Indication",
            "model": Indication,
            "ddict": IndicationDataDict,
            "django": IndicationDjango,
            "frontend_interface": "IndicationCore",
        },
        {
            "name": "IndicationType",
            "model": IndicationType,
            "ddict": IndicationTypeDataDict,
            "django": IndicationTypeDjango,
            "frontend_interface": "IndicationTypeCore",
        },
        {
            "name": "Intervention",
            "model": Intervention,
            "ddict": InterventionDataDict,
            "django": InterventionDjango,
            "frontend_interface": "InterventionCore",
        },
        {
            "name": "InterventionType",
            "model": InterventionType,
            "ddict": InterventionTypeDataDict,
            "django": InterventionTypeDjango,
            "frontend_interface": "InterventionTypeCore",
        },
        {
            "name": "Unit",
            "model": Unit,
            "ddict": UnitDataDict,
            "django": UnitDjango,
            "frontend_interface": "UnitCore",
        },
        {
            "name": "UnitType",
            "model": UnitType,
            "ddict": UnitTypeDataDict,
            "django": UnitTypeDjango,
            "frontend_interface": "UnitTypeCore",
        },
        {
            "name": "InformationSource",
            "model": InformationSource,
            "ddict": InformationSourceDataDict,
            "django": InformationSourceDjango,
            "frontend_interface": "InformationSourceCore",
        },
        {
            "name": "InformationSourceType",
            "model": InformationSourceType,
            "ddict": InformationSourceTypeDataDict,
            "django": InformationSourceTypeDjango,
            "frontend_interface": "InformationSourceTypeCore",
        },
        {
            "name": "Citation",
            "model": Citation,
            "ddict": CitationDataDict,
            "django": CitationDjango,
            "frontend_interface": "CitationCore",
        },
    ]


def _django_field_types(model_cls: Any) -> dict[str, str]:
    out: dict[str, str] = {}
    for field in model_cls._meta.get_fields():  # type: ignore[attr-defined]
        if field.auto_created and not field.concrete:
            continue
        out[field.name] = type(field).__name__
    return out


def build_matrix() -> dict[str, Any]:
    ts_interfaces = _parse_ts_interfaces(REPO_ROOT / "frontend/src/types/coreConcepts.ts")
    builders = _builders()
    concepts = _concepts()

    concept_rows: list[dict[str, Any]] = []

    for concept in concepts:
        concept_name = concept["name"]
        model_cls = concept["model"]
        ddict_cls = concept["ddict"]
        django_cls = concept["django"]
        ts_interface_name = concept["frontend_interface"]

        model_hints = {k: _type_to_str(v) for k, v in get_type_hints(model_cls, include_extras=True).items()}
        ddict_hints = {k: _type_to_str(v) for k, v in get_type_hints(ddict_cls, include_extras=True).items()}
        django_hints = _django_field_types(django_cls)
        frontend_hints_raw = ts_interfaces.get(ts_interface_name, {})
        frontend_hints = {
            _camel_to_snake(field_name): field_type
            for field_name, field_type in frontend_hints_raw.items()
        }

        runtime_ddict = builders[concept_name]().ddict
        runtime_types = {k: type(v).__name__ for k, v in runtime_ddict.items()}

        fields = sorted(set(model_hints) | set(ddict_hints) | set(django_hints) | set(frontend_hints) | set(runtime_types))

        field_rows: list[dict[str, Any]] = []
        for field_name in fields:
            row = {
                "field": field_name,
                "pydantic": model_hints.get(field_name, ""),
                "ddict": ddict_hints.get(field_name, ""),
                "django": django_hints.get(field_name, ""),
                "runtime_ddict": runtime_types.get(field_name, ""),
                "frontend": frontend_hints.get(field_name, ""),
            }
            non_empty = [
                value
                for key, value in row.items()
                if key != "field" and value not in ("", None)
            ]
            row["drift"] = len(set(non_empty)) > 1
            field_rows.append(row)

        concept_rows.append(
            {
                "concept": concept_name,
                "frontend_interface": ts_interface_name,
                "fields": field_rows,
            }
        )

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "source_files": {
            "frontend": str(REPO_ROOT / "frontend/src/types/coreConcepts.ts"),
            "script": str(Path(__file__).resolve()),
        },
        "concepts": concept_rows,
    }


def _render_markdown(matrix: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append("# Core Concept Type Matrix")
    lines.append("")
    lines.append(
        "This file is generated by `scripts/generate_core_concept_type_matrix.py`."
    )
    lines.append("")

    for concept in matrix["concepts"]:
        lines.append(f"## {concept['concept']}")
        lines.append("")
        lines.append(
            "| Field | Pydantic Model | DataDict | Django ORM | Runtime `ddict` type | Frontend Canonical | Drift |"
        )
        lines.append("|---|---|---|---|---|---|---|")
        for field in concept["fields"]:
            lines.append(
                "| {field} | {pydantic} | {ddict} | {django} | {runtime_ddict} | {frontend} | {drift} |".format(
                    field=field["field"],
                    pydantic=field["pydantic"].replace("|", "\\|"),
                    ddict=field["ddict"].replace("|", "\\|"),
                    django=field["django"],
                    runtime_ddict=field["runtime_ddict"],
                    frontend=field["frontend"].replace("|", "\\|"),
                    drift="yes" if field["drift"] else "no",
                )
            )
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    matrix = build_matrix()
    docs_dir = REPO_ROOT / "docs/guides"
    docs_dir.mkdir(parents=True, exist_ok=True)

    json_path = docs_dir / "core-concept-type-matrix.json"
    md_path = docs_dir / "core-concept-type-matrix.md"

    json_path.write_text(json.dumps(matrix, indent=2, sort_keys=False), encoding="utf-8")
    md_path.write_text(_render_markdown(matrix), encoding="utf-8")

    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
