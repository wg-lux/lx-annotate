# Core Concept Contract

## Purpose
This guide defines the single canonical contract for core knowledge-base concepts used across backend and frontend.

## Core Concepts
- Classification
- ClassificationChoice
- ClassificationChoiceDescriptor
- Examination
- Finding
- FindingType
- Indication
- IndicationType
- Intervention
- InterventionType
- Unit
- UnitType
- InformationSource
- InformationSourceType
- Citation

## Source-Of-Truth Order
1. Canonical contract model definitions in `lx-data-models/lx_dtypes/models/contracts/core_concepts.py`
2. Adapter conversion logic in `lx-data-models/lx_dtypes/models/contracts/adapters.py`
3. Storage representation in KB/YAML `ddict` (CSV-compatible list serialization preserved)
4. Frontend canonical TypeScript interfaces in `frontend/src/types/coreConcepts.ts`
5. Store-local view models derived from canonical types (only when view-specific fields are required)

## Identity Rule
- Canonical identity is dual key:
  - `name: string` (semantic reference, required)
  - `id?: number` (optional persistence/API reference)

## Collection Rule
- Canonical payloads always use arrays for multi-valued fields.
- Storage compatibility keeps CSV list serialization for KB/YAML-facing data.
- All CSV <-> array conversion is isolated in adapters.

## API Surface
- Canonical payload endpoint:
  - `GET /base_api/core-concepts/{module_name}`

## Drift Audit
- Matrix generator script:
  - `scripts/generate_core_concept_type_matrix.py`
- Generated outputs:
  - `docs/guides/core-concept-type-matrix.md`
  - `docs/guides/core-concept-type-matrix.json`
