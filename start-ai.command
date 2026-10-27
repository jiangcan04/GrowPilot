#!/bin/bash
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
import getpass
import os
from pathlib import Path
import subprocess
import sys
key = os.environ.get("OPENAI_API_KEY", "").strip()
if not key:
    key = getpass.getpass("OpenAI API Key (hidden; kept only for this session): ").strip()
if not key:
    print("No key supplied. You can still run bash start.command for rule preview.")
    sys.exit(1)
env = os.environ.copy()
env["OPENAI_API_KEY"] = key
subprocess.run(["node", "scripts/dev.mjs"], env=env)
PY
