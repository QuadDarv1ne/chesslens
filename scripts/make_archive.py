#!/usr/bin/env python3
"""Собирает итоговый zip-архив проекта ChessLens в download/.

Включает: исходники, конфиги деплоя, docs, .git (история), db.
Исключает: node_modules, .next, логи, песочничные каталоги (upload/download/skills/.zscripts/examples/mini-services/tests/Caddyfile).
Итоговые пути в архиве начинаются с chesslens/ — при распаковке создаётся папка проекта.
"""
import os
import zipfile

ROOT = "/home/z/my-project"
OUT = os.path.join(ROOT, "download", "chesslens-v0.3.0.zip")
PREFIX = "chesslens"

EXCLUDE_DIRS = {
    "node_modules", ".next", "download", "upload", "skills",
    ".zscripts", "examples", "mini-services", "tests",
    "node_modules.bak",
}
EXCLUDE_FILES = {
    "Caddyfile", "dev.log", "server.log", "nohup.out", ".DS_Store",
    "dev.pid", "dev.out.log", "bun.lockb",
}
EXCLUDE_EXT = {".log", ".pid", ".out"}


def skip_dir(name: str) -> bool:
    return name in EXCLUDE_DIRS


def skip_file(name: str) -> bool:
    if name in EXCLUDE_FILES:
        return True
    _, ext = os.path.splitext(name)
    return ext in EXCLUDE_EXT


def main() -> None:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if os.path.exists(OUT):
        os.remove(OUT)

    count = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            # фильтруем каталоги на месте, чтобы не заходить в исключённые
            dirnames[:] = [d for d in dirnames if not skip_dir(d)]
            dirnames.sort()
            for name in sorted(filenames):
                if skip_file(name):
                    continue
                full = os.path.join(dirpath, name)
                rel = os.path.relpath(full, ROOT)
                arcname = os.path.join(PREFIX, rel)
                zf.write(full, arcname)
                count += 1

    size_mb = os.path.getsize(OUT) / (1024 * 1024)
    print(f"OK: {OUT}")
    print(f"files: {count}, size: {size_mb:.2f} MB")


if __name__ == "__main__":
    main()
