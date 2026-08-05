#!/usr/bin/env bash
# Render build entrypoint: creates three SEPARATE venvs and installs each
# project's own requirements.txt into its own venv. Nothing is merged —
# see start.sh, which runs each service out of the matching venv below.
#
# - school-management-system/.venv  <- school-management-system/backend/requirements.txt
# - EducationAI/.venv                <- EducationAI/backend/requirements.txt
# - ./.venv (root)                   <- ./requirements.txt (werkzeug + gunicorn, gateway only)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

build_venv() {
    local label="$1"
    local venv_dir="$2"
    local requirements_file="$3"

    echo "==> [$label] Creating venv at $venv_dir (if missing)..."
    if [ ! -d "$venv_dir" ]; then
        "$PYTHON_BIN" -m venv "$venv_dir"
    fi

    local venv_python="$venv_dir/bin/python"
    local venv_pip="$venv_dir/bin/pip"

    echo "==> [$label] Upgrading pip..."
    "$venv_python" -m pip install --upgrade pip

    echo "==> [$label] Installing $requirements_file..."
    "$venv_pip" install -r "$requirements_file"

    echo "==> [$label] Done."
}

build_venv "koderkids" \
    "$ROOT_DIR/school-management-system/.venv" \
    "$ROOT_DIR/school-management-system/backend/requirements.txt"

build_venv "educationai" \
    "$ROOT_DIR/EducationAI/.venv" \
    "$ROOT_DIR/EducationAI/backend/requirements.txt"

build_venv "gateway" \
    "$ROOT_DIR/.venv" \
    "$ROOT_DIR/requirements.txt"

echo "==> All three venvs are built and isolated."
