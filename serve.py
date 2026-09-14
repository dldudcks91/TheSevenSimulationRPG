"""로컬 개발 서버 — `python -m http.server` 와 같지만 **캐시를 끈다**.

`start.bat` 이 이걸 띄운다. 포트는 인자로 받고 기본값 8777, 서빙 루트는 언제나 이 파일 옆의 `src/` 다
(cwd 와 무관하게 같은 곳을 준다 — 배치 파일이 `cd` 를 안 해도 된다).

## 왜 http.server 를 그냥 안 쓰나 [2026-09-05]

아트를 **같은 파일명으로 갈아끼우는** 일이 잦다(시트에서 타일을 다시 따서 `hero_6.png` 를 덮어쓰는 식).
그런데 `http.server` 는 `Cache-Control` 도 `ETag` 도 안 보내고 `Last-Modified` 하나만 준다.
그러면 브라우저가 **휴리스틱 캐시**로 옛 그림을 계속 재사용해서 — 서버는 새 바이트를 갖고 있는데
화면만 안 바뀐다. 파일을 지웠다 다시 만들어도 경로가 같으면 마찬가지다.

`no-store` 를 붙여 그 경우를 없앤다. 개발 서버라 캐시를 버려서 손해 볼 것이 없다.

## localhost 가 느리던 이유 [2026-09-14]

도감 초상 14장에 3초가 걸렸다. 원인은 둘이고 곱해졌다:
1. IPv4(`0.0.0.0`)만 들었다 — 브라우저는 `localhost` 를 IPv6(`::1`)로 먼저 붙다가 거절당하고 IPv4 로 돌아간다. 연결마다 약 0.2초
2. HTTP/1.0 이라 연결을 재사용하지 않았다 — 그 0.2초를 그림 수만큼 치른다(`no-store` 라 다시 그릴 때마다 또)

그래서 한 소켓으로 IPv4·IPv6 를 같이 받고(`IPV6_V6ONLY = 0`) HTTP/1.1 로 연결을 잇는다. 같은 14장이 0.015초.
"""

import http.server
import os
import socket
import socketserver
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
HOST = "::" if socket.has_ipv6 else ""   # "::" + V6ONLY 끔 = ::1 과 127.0.0.1 을 한 소켓이 받는다


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler + 캐시 금지 헤더."""

    protocol_version = "HTTP/1.1"   # 연결을 잇는다 — 파일 응답은 Content-Length 를 실으므로 그대로 된다

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # 모든 응답에 붙는다 — 디렉터리 목록·404 까지 포함이라 예외가 안 생긴다
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    address_family = socket.AF_INET6 if socket.has_ipv6 else socket.AF_INET
    allow_reuse_address = True   # Ctrl+C 로 끈 직후 다시 띄울 때 TIME_WAIT 로 막히지 않게
    daemon_threads = True        # 브라우저가 커넥션을 물고 있어도 Ctrl+C 로 죽는다

    def server_bind(self):
        if self.address_family == socket.AF_INET6:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


if __name__ == "__main__":
    with Server((HOST, PORT), NoCacheHandler) as httpd:
        print(f"serving {ROOT}")
        print(f"  http://localhost:{PORT}/index.html      (Cache-Control: no-store)")
        print(f"  http://localhost:{PORT}/dev/test.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye")
