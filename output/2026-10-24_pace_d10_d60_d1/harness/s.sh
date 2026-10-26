#!/bin/sh
# usage: s.sh "python code"   |  s.sh -f file.py
cd "$(dirname "$0")"
export PYTHONIOENCODING=utf-8
if [ "$1" = "-f" ]; then "$LOCALAPPDATA/Programs/Python/Python312/python.exe" send.py "$2"; else "$LOCALAPPDATA/Programs/Python/Python312/python.exe" send.py -c "$1"; fi
