"""Send a snippet file to the driver: python send.py cmd.py"""
import sys
import urllib.request

code = open(sys.argv[1], encoding="utf-8").read()
req = urllib.request.Request("http://127.0.0.1:8812/", data=code.encode("utf-8"), method="POST")
with urllib.request.urlopen(req, timeout=3600) as r:
    sys.stdout.reconfigure(encoding="utf-8")
    print(r.read().decode("utf-8"))
