"""Send a snippet to the driver: python send.py file.py  |  python send.py -c "code" """
import sys, urllib.request
code = sys.argv[2] if sys.argv[1] == '-c' else open(sys.argv[1], encoding='utf-8').read()
req = urllib.request.Request('http://127.0.0.1:8833/', data=code.encode('utf-8'), method='POST')
with urllib.request.urlopen(req, timeout=3600) as r:
    sys.stdout.reconfigure(encoding='utf-8')
    print(r.read().decode('utf-8'))
