#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
command -v gh >/dev/null || { echo 'Instale GitHub CLI gh e execute gh auth login primeiro.' >&2; exit 1; }
if ! python3 -c 'import reportlab' >/dev/null 2>&1; then
  echo 'Instalando reportlab apenas na pasta local .python-deps (sem sudo)...'
  python3 -m pip install --target "$PWD/.python-deps" 'reportlab>=4,<5' || echo 'Sem reportlab; sera gerado Markdown somente.'
  export PYTHONPATH="$PWD/.python-deps${PYTHONPATH:+:$PYTHONPATH}"
fi
python3 scripts/collect-evidence.py "$@"
