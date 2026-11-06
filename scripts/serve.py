"""Local-only development server; updated modules must not use an old cache."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class GameHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent / "dist"
    server = ThreadingHTTPServer(("127.0.0.1", 4173), partial(GameHandler, directory=str(root)))
    print("游戏已启动：http://127.0.0.1:4173/  （Ctrl+C 停止）", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
