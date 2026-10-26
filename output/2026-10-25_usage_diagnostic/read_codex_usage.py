"""Read Codex account limits and activity without starting a model turn."""

import json
import queue
import subprocess
import sys
import threading
import time
from pathlib import Path


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    extensions = Path("C:/Users/ANGames-001/.vscode/extensions")
    executables = list(extensions.glob("openai.chatgpt-*/bin/windows-x86_64/codex.exe"))
    executable = max(executables, key=lambda path: path.stat().st_mtime)
    process = subprocess.Popen(
        [str(executable), "app-server", "--stdio"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    messages = queue.Queue()
    errors = []

    def read_output():
        for line in process.stdout:
            try:
                messages.put(json.loads(line))
            except json.JSONDecodeError:
                pass

    def read_errors():
        for line in process.stderr:
            errors.append(line.rstrip())

    threading.Thread(target=read_output, daemon=True).start()
    threading.Thread(target=read_errors, daemon=True).start()

    def send(message):
        process.stdin.write(json.dumps(message) + "\n")
        process.stdin.flush()

    def response(identifier, timeout=20):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                message = messages.get(timeout=max(0.01, deadline - time.monotonic()))
            except queue.Empty:
                return {"timeout": True}
            if message.get("id") == identifier:
                return message
        return {"timeout": True}

    def emit(label, value):
        print(json.dumps({label: value}, ensure_ascii=False), flush=True)

    try:
        send({
            "id": 1,
            "method": "initialize",
            "params": {
                "clientInfo": {"name": "codex_usage_diagnostic", "version": "0.1"},
                "capabilities": {"experimentalApi": True},
            },
        })
        initialized = response(1)
        emit("initialize", initialized)
        if "result" not in initialized:
            return
        send({"method": "initialized", "params": {}})
        send({"id": 2, "method": "account/read", "params": {"refreshToken": False}})
        account_response = response(2)
        if "result" in account_response:
            account = account_response["result"].get("account") or {}
            account_response = {
                "account": {key: account.get(key) for key in ("type", "planType")},
                "requiresOpenaiAuth": account_response["result"].get("requiresOpenaiAuth"),
            }
        emit("account", account_response)
        send({"id": 3, "method": "account/rateLimits/read"})
        emit("rateLimits", response(3))
        send({"id": 4, "method": "account/usage/read"})
        emit("usage", response(4))
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        emit("startup_errors", errors[-5:])


if __name__ == "__main__":
    main()
