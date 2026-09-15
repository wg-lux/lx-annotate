{
  lib,
  stdenvNoCC,
  python312,
}:

let
  projectMetadata = lib.importTOML ./pyproject.toml;
  version = projectMetadata.project.version;
  featurePython = python312.withPackages (pythonPackages: [ pythonPackages.pyyaml ]);
  featureSource = lib.cleanSourceWith {
    src = ./feature-tracking;
    filter = path: type: type == "directory" || lib.hasSuffix ".yml" (toString path);
  };
in
stdenvNoCC.mkDerivation {
  pname = "lx-annotate-feature-specifications";
  inherit version;
  src = featureSource;

  nativeBuildInputs = [ featurePython ];

  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    runHook preInstall

    output="$out/share/lx-annotate/features"
    mkdir -p "$output"
    ${featurePython.interpreter} - "$PWD" "$output" <<'PY'
    import sys
    from pathlib import Path

    import yaml

    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    seen = set()
    top_keys = (
        "schema_version", "id", "name", "description", "owners",
        "production_critical", "source_documents", "invariants",
    )
    requirement_keys = (
        "id", "category", "title", "acceptance", "required", "verification",
    )
    for path in sorted(source.rglob("*.yml")):
        if path.name in {
            "PackagedKnowledgeBaseResources.yml", "policy.yml",
            "schema.example.yml", "standard.yml",
        }:
            continue
        value = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(value, dict) or not isinstance(value.get("id"), str):
            continue
        feature_id = value["id"]
        if feature_id in seen:
            raise ValueError(f"duplicate feature id: {feature_id}")
        seen.add(feature_id)
        specification = {key: value[key] for key in top_keys if key in value}
        specification["definition_of_done"] = [
            {key: requirement[key] for key in requirement_keys if key in requirement}
            for requirement in value.get("definition_of_done", [])
        ]
        (output / f"{feature_id}.yml").write_text(
            yaml.safe_dump(specification, sort_keys=False), encoding="utf-8"
        )
    PY

    runHook postInstall
  '';
}
