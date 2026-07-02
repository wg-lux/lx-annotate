"""Proxy to upstream migration."""

from importlib import import_module

Migration = import_module(
    "endoreg_db.migrations.0003_patientexaminationreport_report_and_more"
).Migration
