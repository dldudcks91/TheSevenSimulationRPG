"""로컬 개발 서버 — `python -m http.server` 와 같지만 **쓸 때마다 재검증한다**(바뀐 파일만 다시 받는다).

`start.bat` 이 이걸 띄운다. 포트는 인자로 받고 기본값 8777, 서빙 루트는 언제나 이 파일 옆의 `src/` 다
(cwd 와 무관하게 같은 곳을 준다 — 배치 파일이 `cd` 를 안 해도 된다).

## 왜 http.server 를 그냥 안 쓰나 [2026-09-05]

아트를 **같은 파일명으로 갈아끼우는** 일이 잦다(시트에서 타일을 다시 따서 `hero_6.png` 를 덮어쓰는 식).
그런데 `http.server` 는 `Cache-Control` 도 `ETag` 도 안 보내고 `Last-Modified` 하나만 준다.
그러면 브라우저가 **휴리스틱 캐시**로 옛 그림을 계속 재사용해서 — 서버는 새 바이트를 갖고 있는데
화면만 안 바뀐다. 파일을 지웠다 다시 만들어도 경로가 같으면 마찬가지다.

`no-cache` + `ETag` 로 그 경우를 없앤다 [2026-09-24] — 브라우저는 파일을 **쓸 때마다 서버에 묻고**, 그대로면 본문 없이 304 로 끝난다.
ETag 는 수정 시각(ns) + 크기라 같은 이름으로 덮어쓰면 달라진다. `Last-Modified` 만으로 재검증하지 않는 이유는
**원본 시각을 보존하는 복사**(`Copy-Item` · `shutil.copy2`)가 더 옛 시각을 들고 와 304 에 걸리기 때문이다.

⚠ 처음(2026-09-05)엔 `no-store` 였다 — 캐시를 아예 버리면 화면을 다시 그릴 때마다(`render()` 는 `<img>` 를 새로 만든다)
같은 그림을 **본문째 다시 받고 다시 디코딩**한다. 캐릭터 탭 가방 클릭 한 번에 22장 · 1.4MB 였다(2026-09-24 실측).

## localhost 가 느리던 이유 [2026-09-14]

도감 초상 14장에 3초가 걸렸다. 원인은 둘이고 곱해졌다:
1. IPv4(`0.0.0.0`)만 들었다 — 브라우저는 `localhost` 를 IPv6(`::1`)로 먼저 붙다가 거절당하고 IPv4 로 돌아간다. 연결마다 약 0.2초
2. HTTP/1.0 이라 연결을 재사용하지 않았다 — 그 0.2초를 그림 수만큼 치른다(당시 `no-store` 라 다시 그릴 때마다 또)

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
    """SimpleHTTPRequestHandler + 재검증 헤더(`no-cache` + ETag) — 쓸 때마다 묻고, 그대로면 304."""

    protocol_version = "HTTP/1.1"   # 연결을 잇는다 — 파일 응답은 Content-Length 를 실으므로 그대로 된다

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        # 파일이면 ETag 를 단다 — 브라우저가 들고 온 것과 같으면 본문 없이 304.
        # 부모는 If-None-Match 가 오면 If-Modified-Since 를 안 보고 늘 200 을 주므로 여기서 먼저 가른다
        self._etag = None
        path = self.translate_path(self.path)
        if os.path.isfile(path):
            st = os.stat(path)
            self._etag = f'"{st.st_mtime_ns:x}-{st.st_size:x}"'
            tags = [t.strip() for t in self.headers.get("If-None-Match", "").split(",")]
            if any((t[2:] if t.startswith("W/") else t) == self._etag for t in tags):
                self.send_response(304)
                self.end_headers()
                return None
        return super().send_head()

    def end_headers(self):
        # 모든 응답에 붙는다 — 디렉터리 목록·404 까지 포함이라 예외가 안 생긴다.
        # ETag 는 이 응답의 파일 몫만 — 연결을 이어 쓰므로 다음 응답에 새지 않게 비운다
        self.send_header("Cache-Control", "no-cache")
        etag, self._etag = getattr(self, "_etag", None), None
        if etag:
            self.send_header("ETag", etag)
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
        print(f"  http://localhost:{PORT}/index.html      (Cache-Control: no-cache + ETag)")
        print(f"  http://localhost:{PORT}/dev/test.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye")
