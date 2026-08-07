#!/usr/bin/env bash
# Render entrypoint: starts both Django backends + the Werkzeug gateway
# that fronts them, in a single service/process group.
#
# - koderkids (school-management-system/backend) -> 127.0.0.1:8001, background
# - educationai (EducationAI/backend)             -> 127.0.0.1:8002, background
# - gateway (wsgi_gateway.py)                      -> 0.0.0.0:$PORT, foreground
#
# Each backend keeps its own venv and its own requirements.txt (see
# school-management-system/.venv and EducationAI/.venv) — nothing here
# merges them. If any of the three gunicorn processes dies, this script
# exits non-zero so Render restarts the whole service instead of limping
# along with a half-dead gateway.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GUNICORN_TIMEOUT="${GUNICORN_TIMEOUT:-120}"

KODERKIDS_DIR="$ROOT_DIR/school-management-system/backend"
KODERKIDS_VENV_GUNICORN="$ROOT_DIR/school-management-system/.venv/bin/gunicorn"

EDUCATIONAI_DIR="$ROOT_DIR/EducationAI/backend"
EDUCATIONAI_VENV_GUNICORN="$ROOT_DIR/EducationAI/.venv/bin/gunicorn"

GATEWAY_VENV_GUNICORN="$ROOT_DIR/.venv/bin/gunicorn"

# Prefer each project's own venv gunicorn; fall back to PATH if not present.
[ -x "$KODERKIDS_VENV_GUNICORN" ] || KODERKIDS_VENV_GUNICORN="gunicorn"
[ -x "$EDUCATIONAI_VENV_GUNICORN" ] || EDUCATIONAI_VENV_GUNICORN="gunicorn"
[ -x "$GATEWAY_VENV_GUNICORN" ] || GATEWAY_VENV_GUNICORN="gunicorn"

PIDS=()

cleanup() {
    echo "==> Stopping all backend/gateway processes..."
    for pid in "${PIDS[@]:-}"; do
        kill "$pid" 2>/dev/null || true
    done
}
trap cleanup EXIT INT TERM

echo "==> Starting koderkids (school-management-system) on 127.0.0.1:8001..."
if [ -z "${KODERKIDS_DATABASE_URL:-}" ]; then
    echo "==> ERROR: KODERKIDS_DATABASE_URL is not set. Refusing to start koderkids"
    echo "    against the shared DATABASE_URL (that would collide with educationai)."
    exit 1
fi
DATABASE_URL="$KODERKIDS_DATABASE_URL" \
"$KODERKIDS_VENV_GUNICORN" school_management.wsgi:application \
    --chdir "$KODERKIDS_DIR" \
    --bind 127.0.0.1:8001 \
    --timeout "$GUNICORN_TIMEOUT" \
    --workers 2 &
PIDS+=("$!")

echo "==> Starting educationai (EducationAI) on 127.0.0.1:8002..."
"$EDUCATIONAI_VENV_GUNICORN" config.wsgi:application \
    --chdir "$EDUCATIONAI_DIR" \
    --bind 127.0.0.1:8002 \
    --timeout "$GUNICORN_TIMEOUT" \
    --workers 2 &
PIDS+=("$!")

echo "==> Starting gateway (wsgi_gateway.py) in foreground on 0.0.0.0:${PORT:-8000}..."
"$GATEWAY_VENV_GUNICORN" wsgi_gateway:application \
    --chdir "$ROOT_DIR" \
    --bind "0.0.0.0:${PORT:-8000}" \
    --timeout "$GUNICORN_TIMEOUT" \
    --workers 2 &
PIDS+=("$!")

# Block until whichever of the three exits first, then propagate its exit
# code so Render treats the whole service as failed and restarts it.
wait -n "${PIDS[@]}"
EXIT_CODE=$?
echo "==> A process exited (code=$EXIT_CODE); shutting down the rest."
exit "$EXIT_CODE"
