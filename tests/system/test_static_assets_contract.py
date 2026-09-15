"""Exercise the same static contract used by build and service-user startup."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tarfile
import venv
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
CHECK = ROOT / "lx_annotate_assets/__init__.py"
MANIFEST = {"src/main.ts": {"file": "main.js", "isEntry": True, "css": ["main.css"]}}


def run(*args, env=None):
    return subprocess.run(
        [sys.executable, str(CHECK), *map(str, args)],
        env=env,
        capture_output=True,
        text=True,
        timeout=15,
    )


def wheel(tmp_path, manifest=MANIFEST, omit=None):
    target = tmp_path / "candidate.whl"
    with zipfile.ZipFile(target, "w") as archive:
        for name, content in {
            ".vite/manifest.json": json.dumps(manifest),
            "main.js": "export {};",
            "main.css": "body{}",
        }.items():
            if name != omit:
                archive.writestr("lx_annotate/staticfiles/" + name, content)
    return target


def test_valid_wheel_passes(tmp_path):
    result = run("--wheel", wheel(tmp_path))
    assert result.returncode == 0, result.stderr
    assert result.stdout == ""


@pytest.mark.parametrize(
    "manifest",
    [
        {},
        [],
        None,
        {"src/main.ts": None},
        {"src/main.ts": {"file": "main.js"}},
        {"src/main.ts": {"file": "../main.js", "isEntry": True}},
        {"src/main.ts": {"file": "/main.js", "isEntry": True}},
        {"src/main.ts": {"file": "main.js", "isEntry": True, "css": "main.css"}},
        {"src/main.ts": {"file": "main.js", "isEntry": True, "imports": ["absent"]}},
        {
            "src/main.ts": {
                "file": "main.js",
                "isEntry": True,
                "dynamicImports": ["absent"],
            }
        },
    ],
)
def test_rejects_invalid_manifest(tmp_path, manifest):
    result = run("--wheel", wheel(tmp_path, manifest))
    assert result.returncode == 1
    assert result.stdout == ""
    assert "static asset validation failed" in result.stderr


@pytest.mark.parametrize("omit", [".vite/manifest.json", "main.js", "main.css"])
def test_rejects_missing_asset(tmp_path, omit):
    assert run("--wheel", wheel(tmp_path, omit=omit)).returncode == 1


def installed(tmp_path):
    site = tmp_path / "site"
    site.mkdir()
    metadata = site / "lx_annotate-1.0.dist-info"
    metadata.mkdir()
    (metadata / "METADATA").write_text("Name: lx-annotate\nVersion: 1.0\n")
    package = site / "lx_annotate"
    package.mkdir()
    (package / "__init__.py").write_text(
        "raise RuntimeError('Django must not initialize')\n"
    )
    # An empty higher-priority directory must not hide a complete static tree.
    (package / "staticfiles").mkdir()
    assets = package / "static"
    (assets / ".vite").mkdir(parents=True)
    (assets / ".vite/manifest.json").write_text(json.dumps(MANIFEST))
    (assets / "main.js").write_text("export {};")
    (assets / "main.css").write_text("body{}")
    return assets, {**os.environ, "PYTHONPATH": str(site)}


def test_installed_discovery_has_only_path_output_and_does_not_import_app(tmp_path):
    assets, env = installed(tmp_path)
    result = run("--installed", env=env)
    assert result.returncode == 0, result.stderr
    assert result.stdout == str(assets) + "\n"
    assert result.stderr == ""


def test_installed_rejects_escaping_symlink(tmp_path):
    assets, env = installed(tmp_path)
    outside = tmp_path / "outside.js"
    outside.write_text("export {};")
    (assets / "main.js").unlink()
    (assets / "main.js").symlink_to(outside)
    result = run("--installed", env=env)
    assert result.returncode == 1
    assert result.stdout == ""


@pytest.mark.parametrize(
    "reference", ["/etc/passwd", "../outside", "x/../main.js", "x\\main.js"]
)
def test_root_rejects_unsafe_paths(tmp_path, reference):
    assets, _ = installed(tmp_path)
    (assets / ".vite/manifest.json").write_text(
        json.dumps(
            {
                "src/main.ts": {"file": reference, "isEntry": True},
            }
        )
    )
    assert run("--root", assets).returncode == 1


@pytest.mark.parametrize("content", ["", "{", "null", "[]"])
def test_root_rejects_invalid_json_without_logging_contents(tmp_path, content):
    assets, _ = installed(tmp_path)
    (assets / ".vite/manifest.json").write_text(content)
    result = run("--root", assets)
    assert result.returncode == 1
    assert result.stdout == ""
    assert "static asset validation failed" in result.stderr


def test_empty_asset_rejected(tmp_path):
    assets, _ = installed(tmp_path)
    (assets / "main.css").write_bytes(b"")
    assert run("--root", assets).returncode == 1


@pytest.fixture
def build_project(tmp_path):
    pytest.importorskip(
        "hatchling", reason="Packaging tests require the Hatch build backend"
    )
    project = tmp_path / "project"
    project.mkdir()
    for name in [
        "pyproject.toml",
        "hatch_build.py",
        "lx_annotate_assets/__init__.py",
        "README.md",
    ]:
        path = project / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes((ROOT / name).read_bytes())
    (project / "lx_annotate").mkdir()
    (project / "lx_annotate/__init__.py").write_text(
        "raise RuntimeError('Application must not initialize during static validation')\n"
    )
    assets = project / "staticfiles"
    (assets / ".vite").mkdir(parents=True)
    (assets / ".vite/manifest.json").write_text(json.dumps(MANIFEST))
    (assets / "main.js").write_text("export {};")
    (assets / "main.css").write_text("body{}")
    return project


def build(project, target):
    return subprocess.run(
        [sys.executable, "-m", "hatchling", "build", "-t", target],
        cwd=project,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_build_hook_rejects_broken_source_before_wheel_publication(build_project):
    (build_project / "staticfiles/main.css").unlink()
    result = build(build_project, "wheel")
    assert result.returncode != 0
    assert "static asset validation failed" in result.stderr
    assert not list((build_project / "dist").glob("*.whl"))


def test_build_hook_rejects_wheel_with_assets_packaged_at_wrong_location(build_project):
    config = build_project / "pyproject.toml"
    config.write_text(
        config.read_text().replace(
            '"staticfiles" = "lx_annotate/staticfiles"',
            '"staticfiles" = "lx_annotate/misplaced-assets"',
        )
    )
    result = build(build_project, "wheel")
    assert result.returncode != 0
    assert "static asset validation failed" in result.stderr


def test_editable_install_does_not_require_frontend_build(build_project):
    pytest.importorskip("editables", reason="Hatch editable builds require editables")
    (build_project / "staticfiles/main.css").unlink()
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from hatchling.build import build_editable; build_editable('dist')",
        ],
        cwd=build_project,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr


def test_sdist_wheel_roundtrip_and_dependency_free_installed_command(
    build_project, tmp_path
):
    result = build(build_project, "sdist")
    assert result.returncode == 0, result.stderr
    sdist = next((build_project / "dist").glob("*.tar.gz"))
    unpacked = tmp_path / "sdist"
    with tarfile.open(sdist) as archive:
        archive.extractall(unpacked, filter="data")
    source = next(unpacked.iterdir())
    assert (source / "hatch_build.py").is_file()
    result = build(source, "wheel")
    assert result.returncode == 0, result.stderr
    artifact = next((source / "dist").glob("*.whl"))
    assert run("--wheel", artifact).returncode == 0
    environment = tmp_path / "runtime"
    venv.EnvBuilder(with_pip=False).create(environment)
    subprocess.run(
        [
            "uv",
            "pip",
            "install",
            "--python",
            str(environment / "bin/python"),
            "--no-deps",
            str(artifact),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    clean_env = {key: value for key, value in os.environ.items() if key != "PYTHONPATH"}
    command = environment / "bin/lx-annotate-check-static"
    result = subprocess.run(
        [str(command), "--installed"],
        cwd=tmp_path,
        env=clean_env,
        capture_output=True,
        text=True,
        timeout=15,
    )
    assert result.returncode == 0, result.stderr
    assets = Path(result.stdout.strip())
    assert assets.is_relative_to(environment)
    assert result.stderr == ""
    (assets / "main.css").unlink()
    result = subprocess.run(
        [str(command), "--installed"],
        cwd=tmp_path,
        env=clean_env,
        capture_output=True,
        text=True,
        timeout=15,
    )
    assert result.returncode == 1
    assert result.stdout == ""
