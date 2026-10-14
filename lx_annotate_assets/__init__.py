"""Validate release assets without importing the application or initializing Django."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from collections.abc import Callable, Sequence
from importlib.metadata import PackageNotFoundError, distribution
from pathlib import Path, PurePosixPath


def asset_path(value: object) -> str:
    if (
        not isinstance(value, str)
        or not value
        or "\\" in value
        or any(part in ("", ".", "..") for part in value.split("/"))
        or PurePosixPath(value).is_absolute()
    ):
        raise ValueError("invalid relative asset path")
    return value


def validate(read: Callable[[str], bytes]) -> None:
    manifest = json.loads(read(".vite/manifest.json"))
    if not isinstance(manifest, dict) or not manifest:
        raise ValueError("manifest must be a nonempty object")
    main = manifest.get("src/main.ts")
    if not isinstance(main, dict) or main.get("isEntry") is not True:
        raise ValueError("manifest lacks the src/main.ts entry point")
    for entry in manifest.values():
        if not isinstance(entry, dict):
            raise ValueError("invalid manifest entry")
        files = [entry.get("file")]
        for field in ("css", "assets"):
            values = entry.get(field, [])
            if not isinstance(values, list):
                raise ValueError("invalid manifest asset list")
            files.extend(values)
        for value in files:
            if not read(asset_path(value)):
                raise ValueError("empty referenced asset")
        for field in ("imports", "dynamicImports"):
            values = entry.get(field, [])
            if not isinstance(values, list) or any(
                not isinstance(key, str) or key not in manifest for key in values
            ):
                raise ValueError("unresolved manifest import")


def check_wheel(path: Path) -> None:
    with zipfile.ZipFile(path) as wheel:
        names = wheel.namelist()
        if len(names) != len(set(names)):
            raise ValueError("duplicate wheel members")
        for root in ("lx_annotate/staticfiles/", "lx_annotate/static/"):
            if root + ".vite/manifest.json" in names:
                validate(lambda relative: wheel.read(root + relative))
                return
        raise ValueError("wheel has no packaged Vite manifest")


def check_root(root: Path) -> Path:
    root = root.resolve(strict=True)

    def read(relative: str) -> bytes:
        path = (root / relative).resolve()
        if not path.is_relative_to(root):
            raise ValueError("asset escapes packaged static root")
        if not path.is_file():
            raise ValueError("missing asset")
        return path.read_bytes()

    validate(read)
    return root


def check_installed() -> Path:
    package = Path(str(distribution("lx-annotate").locate_file("lx_annotate"))).resolve()
    for name in ("staticfiles", "static"):
        root = package / name
        if (root / ".vite/manifest.json").is_file():
            return check_root(root)
    raise ValueError("installed wheel has no packaged Vite manifest")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--root", type=Path)
    mode.add_argument("--wheel", type=Path)
    mode.add_argument("--installed", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.wheel:
            check_wheel(args.wheel)
        elif args.root:
            check_root(args.root)
        else:
            # stdout is exclusively the validated installed directory.
            print(check_installed())
    except (
        OSError,
        ValueError,
        KeyError,
        PackageNotFoundError,
        zipfile.BadZipFile,
    ) as error:
        # Do not log manifest contents or application-controlled exception text.
        print(
            "ERROR: LX-Annotate static asset validation failed "
            f"({type(error).__name__}).",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
