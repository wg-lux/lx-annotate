from pathlib import Path
from endoreg_db.utils.paths import data_paths

def assert_dirs():
    for name, path in data_paths.items():
        path.mkdir(parents=True, exist_ok=True)
        print(f"Ensured directory for {name}: {path}")

if __name__ == "__main__":
    assert_dirs()