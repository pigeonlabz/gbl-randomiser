"""Optional static preview server. The demo also works directly on GitHub Pages."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


DEMO_DIRECTORY = Path(__file__).resolve().parent


def create_server(port=8010):
    handler = partial(SimpleHTTPRequestHandler, directory=str(DEMO_DIRECTORY))
    return ThreadingHTTPServer(("127.0.0.1", port), handler)


if __name__ == "__main__":
    with create_server() as server:
        print("Optional static preview: http://127.0.0.1:8010", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
