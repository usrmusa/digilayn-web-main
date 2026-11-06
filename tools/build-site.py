#!/usr/bin/env python3
"""Produce a static local/live website. Serve the output as the document root."""
import argparse
import shutil
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument("target", choices=("local", "live"))
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = root / "dist" / args.target
shutil.copytree(root, output, dirs_exist_ok=True,
                ignore=shutil.ignore_patterns(".git", ".idea", "dist", "AGENTS.md", "__pycache__"))
config = output / "scripts/build-target.js"
config.write_text(config.read_text().replace("const target = 'live';", f"const target = '{args.target}';"))
print(output)
