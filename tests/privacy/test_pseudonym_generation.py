"""Regression checks for persisted, repeatable patient pseudonyms."""

from __future__ import annotations

from datetime import date

import pytest
from endoreg_db.models.administration.center.center import Center
from endoreg_db.models.administration.person.patient.patient import Patient
from endoreg_db.services.pseudonym_service import (
    generate_patient_pseudonym,
    validate_patient_for_pseudonym,
)

pytestmark = pytest.mark.django_db


def test_pseudonym_generation() -> None:
    center = Center.objects.create(name="pseudonym-regression-center")
    patient = Patient.objects.create(
        first_name="Claus",
        last_name="Cleber",
        dob=date(1989, 3, 4),
        center=center,
    )
    assert validate_patient_for_pseudonym(patient) == []
    patient_hash, persisted = generate_patient_pseudonym(patient)
    assert persisted is True
    assert patient_hash.strip()
    patient.refresh_from_db()
    assert patient.patient_hash == patient_hash
    assert generate_patient_pseudonym(patient) == (patient_hash, True)


def test_missing_fields() -> None:
    patient = Patient.objects.create(first_name="Test", last_name="Patient")
    assert validate_patient_for_pseudonym(patient) == ["dob", "center"]
    with pytest.raises(ValueError, match="date of birth"):
        generate_patient_pseudonym(patient)
    patient.refresh_from_db()
    assert not patient.patient_hash


def test_missing_center_does_not_persist_hash() -> None:
    patient = Patient.objects.create(
        first_name="Test",
        last_name="Patient",
        dob=date(1989, 3, 4),
    )
    assert validate_patient_for_pseudonym(patient) == ["center"]
    with pytest.raises(ValueError, match="center"):
        generate_patient_pseudonym(patient)
    patient.refresh_from_db()
    assert not patient.patient_hash
