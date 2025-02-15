import os
import sys
from pathlib import Path

def delete_d_ts_files(directory: str):
    """Delete all .d.ts files in the given directory and its subdirectories."""
    dir_path = Path(directory)
    if not dir_path.exists() or not dir_path.is_dir():
        print(f"Error: Directory '{directory}' does not exist or is not a directory.")
        return
    
    # Find all .d.ts files
    files_to_delete = list(dir_path.rglob("*.d.ts"))
    
    if not files_to_delete:
        print("No .d.ts files found.")
        return
    
    print(f"Found {len(files_to_delete)} .d.ts files:")
    for file in files_to_delete:
        print(f" - {file}")

    # Confirm deletion
    confirm = input("Do you want to delete these files? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Operation canceled.")
        return
    
    # Delete files
    for file in files_to_delete:
        try:
            file.unlink()
            print(f"Deleted: {file}")
        except Exception as e:
            print(f"Failed to delete {file}: {e}")

    print("Cleanup complete.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python cleanup_dts.py <directory_path>")
    else:
        target_directory = sys.argv[1]
        delete_d_ts_files(target_directory)
