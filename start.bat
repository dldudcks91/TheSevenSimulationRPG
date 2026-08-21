@echo off
REM 로컬 서버 실행 — ES Modules는 file:// 에서 CORS로 막히므로 http로 띄운다
cd /d "%~dp0src"
start "" http://localhost:8777/index.html
python -m http.server 8777
