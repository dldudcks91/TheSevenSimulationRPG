"""로컬 개발 서버 — `python -m http.server` 와 같지만 **캐시를 끈다**.

`start.bat` 이 이걸 띄운다. 포트는 인자로 받고 기본값 8777, 서빙 루트는 언제나 이 파일 옆의 `src/` 다
(cwd 와 무관하게 같은 곳을 준다 — 배치 파일이 `cd` 를 안 해도 된다).

## 왜 http.server 를 그냥 안 쓰나 [2026-09-05]

아트를 **같은 파일명으로 갈아끼우는** 일이 잦다(시트에서 타일을 다시 따서 `hero_6.png` 를 덮어쓰는 식).
그런데 `http.server` 는 `Cache-Control` 도 `ETag` 도 안 보내고 `Last-Modified` 하나만 준다.
그러면 브라우저가 **휴리스틱 캐시**로 옛 그림을 계속 재사용해서 — 서버는 새 바이트를 갖고 있는데
화면만 안 바뀐다. 파일을 지웠다 다시 만들어도 경로가 같으면 마찬가지다.

`no-store` 를 붙여 그 경우를 없앤다. 개발 서버라 캐시를 버려서 손해 볼 것이 없다.
"""

import http.server
import os
import socketserver
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8777


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler + 캐시 금지 헤더."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # 모든 응답에 붙는다 — 디렉터리 목록·404 까지 포함이라 예외가 안 생긴다
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True   # Ctrl+C 로 끈 직후 다시 띄울 때 TIME_WAIT 로 막히지 않게
    daemon_threads = True        # 브라우저가 커넥션을 물고 있어도 Ctrl+C 로 죽는다


if __name__ == "__main__":
    with Server(("", PORT), NoCacheHandler) as httpd:
        print(f"serving {ROOT}")
        print(f"  http://localhost:{PORT}/index.html      (Cache-Control: no-store)")
        print(f"  http://localhost:{PORT}/dev/test.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye")
