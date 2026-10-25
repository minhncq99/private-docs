#!/usr/bin/env python3
"""
Python script to scan 'files/' directory and generate data/files.json and js/data.js
Useful for Linux/macOS users and GitHub Actions workflows.
"""

import os
import json
import datetime
from pathlib import Path

def get_folder_node(current_path, root_dir):
    items = []
    try:
        entries = sorted(os.scandir(current_path), key=lambda e: (not e.is_dir(), e.name.lower()))
    except OSError:
        return items

    for entry in entries:
        if entry.name.startswith('.'):
            continue

        rel_path = os.path.relpath(entry.path, root_dir).replace('\\', '/')

        if entry.is_dir():
            children = get_folder_node(entry.path, root_dir)
            stat = entry.stat()
            modified = datetime.datetime.fromtimestamp(stat.st_mtime, tz=datetime.timezone.utc).isoformat()
            items.append({
                "type": "folder",
                "name": entry.name,
                "path": rel_path,
                "items": children,
                "modified": modified
            })
        elif entry.is_file():
            stat = entry.stat()
            ext = os.path.splitext(entry.name)[1].lstrip('.').lower()
            modified = datetime.datetime.fromtimestamp(stat.st_mtime, tz=datetime.timezone.utc).isoformat()
            items.append({
                "type": "file",
                "name": entry.name,
                "path": rel_path,
                "extension": ext,
                "size": stat.st_size,
                "modified": modified
            })

    return items

def main():
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    files_dir = project_root / "files"
    data_dir = project_root / "data"
    js_dir = project_root / "js"

    files_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    js_dir.mkdir(parents=True, exist_ok=True)

    root_items = get_folder_node(files_dir, project_root)

    catalog = {
        "version": "1.0",
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "root": root_items
    }

    json_text = json.dumps(catalog, indent=2, ensure_ascii=False)

    # 1. Write to data/files.json
    with open(data_dir / "files.json", "w", encoding="utf-8") as f:
        f.write(json_text)

    # 2. Write to js/data.js
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    js_content = f"""/**
 * Auto-generated file catalog fallback for Private Docs.
 * Generated at: {now_str}
 */
window.FILE_CATALOG = {json_text};
"""
    with open(js_dir / "data.js", "w", encoding="utf-8") as f:
        f.write(js_content)

    print("Success! File catalog updated at data/files.json and js/data.js")

if __name__ == "__main__":
    main()
