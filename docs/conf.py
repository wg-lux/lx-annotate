"""Sphinx configuration for the lx-data-models documentation."""

from __future__ import annotations

import datetime
import sys
from importlib import metadata
from pathlib import Path

DOCS_PATH = Path(__file__).resolve().parent
REPO_ROOT = DOCS_PATH.parent
sys.path.insert(0, str(REPO_ROOT))

project = "lx-annotate"
author = "Thomas J. Lux"
current_year = datetime.datetime.now(datetime.timezone.utc).year
copyright = f"{current_year}, {author}"
try:
    release = metadata.version("lx-annotate")
except metadata.PackageNotFoundError:  # pragma: no cover - docs built from source tree
    release = "0.0.0"

extensions = [
    "myst_parser",
    "sphinx.ext.autodoc",
    "sphinx.ext.autosummary",
    "sphinx.ext.doctest",
    "sphinx.ext.intersphinx",
    "sphinx.ext.napoleon",
    "sphinx.ext.todo",
    "sphinx.ext.viewcode",
    "sphinx_autodoc_typehints",
    "sphinx_copybutton",
]

myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "fieldlist",
    "linkify",
]

intersphinx_mapping = {
    "python": ("https://docs.python.org/3", "https://docs.python.org/3/objects.inv"),
    "pydantic": (
        "https://docs.pydantic.dev/latest/",
        "https://docs.pydantic.dev/latest/objects.inv",
    ),
}

autosummary_generate = True
autodoc_typehints = "description"
autodoc_default_options = {
    "members": True,
    "undoc-members": False,
    "show-inheritance": True,
}

templates_path = ["_templates"]
exclude_patterns: list[str] = ["_build", "Thumbs.db", ".DS_Store"]

html_theme = "furo"
html_static_path = ["_static"]
html_title = "lx-annotate Documentation"

myst_heading_anchors = 3
todo_include_todos = True
python_use_unqualified_type_names = True
