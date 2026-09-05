@echo off
REM 로컬 서버 실행 — ES Modules는 file:// 에서 CORS로 막히므로 http로 띄운다
REM serve.py = http.server + `Cache-Control: no-store` (2026-09-05)
REM   같은 파일명으로 갈아끼운 아트가 브라우저 캐시 때문에 화면에 안 반영되던 문제. 사유는 serve.py 머리말
start "" http://localhost:8777/index.html
python "%~dp0serve.py" 8777
