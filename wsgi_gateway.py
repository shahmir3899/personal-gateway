"""
Combined WSGI gateway mounting koderkids (school-management-system) and
educationai (EducationAI) under /koderkids and /educationai.

Why this is a reverse proxy and not an in-process import of both Django
`wsgi.application` objects:

  - Django's app registry (django.apps.apps) is a process-wide singleton.
    get_wsgi_application() calls django.setup() once per process; whichever
    project's settings load first "wins" and the second project's setup()
    becomes a no-op. Importing both apps into one interpreter would silently
    serve the second app's requests using the first app's models/views.
  - Both projects also define top-level apps with the same names (core,
    students, finance, attendance, reports, ...). Since Python caches
    imports by bare module name in sys.modules, importing both would let
    one project's module shadow the other's.

So each Django project keeps running as its own normal Gunicorn process
(unchanged, fully isolated), and this file is just a thin dispatcher that
forwards HTTP requests to the right upstream by path prefix.

Run the two backends separately, e.g.:

  gunicorn school_management.wsgi:application \
      --chdir school-management-system/backend --bind 127.0.0.1:8001

  gunicorn config.wsgi:application \
      --chdir EducationAI/backend --bind 127.0.0.1:8002

Then run this gateway in front of them:

  gunicorn wsgi_gateway:application --bind 0.0.0.0:8000

Upstream addresses are configurable via KODERKIDS_UPSTREAM_URL and
EDUCATIONAI_UPSTREAM_URL env vars (defaults below).
"""

import http.client
import os
from urllib.parse import urlsplit

from werkzeug.middleware.dispatcher import DispatcherMiddleware
from werkzeug.wrappers import Request, Response

KODERKIDS_UPSTREAM_URL = os.environ.get("KODERKIDS_UPSTREAM_URL", "http://127.0.0.1:8001")
EDUCATIONAI_UPSTREAM_URL = os.environ.get("EDUCATIONAI_UPSTREAM_URL", "http://127.0.0.1:8002")

# Headers that must not be blindly forwarded/copied between hops (RFC 7230 6.1).
_HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}


def make_proxy_app(upstream_url):
    """Build a WSGI app that forwards every request it receives to `upstream_url`.

    DispatcherMiddleware already strips the mount prefix (/koderkids or
    /educationai) from PATH_INFO before calling this app, so `request.path`
    here is the path the upstream Django app should see.
    """
    parts = urlsplit(upstream_url)
    is_https = parts.scheme == "https"
    host = parts.hostname
    port = parts.port or (443 if is_https else 80)

    def proxy_app(environ, start_response):
        request = Request(environ)

        target_path = request.path or "/"
        if request.query_string:
            target_path += "?" + request.query_string.decode("latin-1")

        forward_headers = {
            key: value
            for key, value in request.headers.items()
            if key.lower() not in _HOP_BY_HOP_HEADERS
        }
        forward_headers["Host"] = host if not parts.port else f"{host}:{parts.port}"

        body = request.get_data(cache=False)

        connection_cls = http.client.HTTPSConnection if is_https else http.client.HTTPConnection
        conn = connection_cls(host, port, timeout=60)
        try:
            conn.request(request.method, target_path, body=body, headers=forward_headers)
            upstream_response = conn.getresponse()
            response_body = upstream_response.read()
            response_headers = [
                (name, value)
                for name, value in upstream_response.getheaders()
                if name.lower() not in _HOP_BY_HOP_HEADERS
            ]
            response = Response(
                response_body,
                status=upstream_response.status,
                headers=response_headers,
            )
        except OSError as exc:
            response = Response(
                f"Upstream {upstream_url} unavailable: {exc}",
                status=502,
                content_type="text/plain",
            )
        finally:
            conn.close()

        return response(environ, start_response)

    return proxy_app


def default_app(environ, start_response):
    response = Response("Not Found. Try /koderkids or /educationai.", status=404)
    return response(environ, start_response)


koderkids_app = make_proxy_app(KODERKIDS_UPSTREAM_URL)
educationai_app = make_proxy_app(EDUCATIONAI_UPSTREAM_URL)

application = DispatcherMiddleware(
    default_app,
    {
        "/koderkids": koderkids_app,
        "/educationai": educationai_app,
    },
)

if __name__ == "__main__":
    from werkzeug.serving import run_simple

    run_simple("0.0.0.0", 8000, application, use_reloader=True)
