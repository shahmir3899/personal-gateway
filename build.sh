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

# face_recognition is intentionally left out of requirements.txt: its metadata
# declares a dependency on "dlib" (by that exact name) with no prebuilt wheels
# on PyPI, which OOMs the build compiling it from source. dlib-bin (already
# installed above, from requirements.txt) provides a working `import dlib` at
# runtime, but pip won't credit it toward face_recognition's own dlib>=19.7
# requirement — so install face_recognition with --no-deps here, now that
# dlib-bin and its other real dependency (face-recognition-models) are already
# in place, to avoid pip re-triggering a source dlib build.
echo "==> [educationai] Installing face_recognition (--no-deps, dlib-bin already covers its dlib requirement)..."
"$ROOT_DIR/EducationAI/.venv/bin/pip" install --no-deps face_recognition==1.3.0

build_venv "gateway" \
    "$ROOT_DIR/.venv" \
    "$ROOT_DIR/requirements.txt"

echo "==> All three venvs are built and isolated."
