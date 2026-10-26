import subprocess, sys
from pathlib import Path
H = Path(__file__).resolve().parent
subprocess.run([sys.executable, str(H / 'drive_sim.py'), 'camp', '8831', '1', '80', '20', 'runs=150&bot=greedy&mastery=1&potion=1&until=1051'])
subprocess.run([sys.executable, str(H / 'drive_sim.py'), 'off', '8831', '1', '80', '20', 'runs=80&bot=off&until=1051'])