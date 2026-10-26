import subprocess, sys
from pathlib import Path
H = Path(__file__).resolve().parent
subprocess.run([sys.executable, str(H / 'drive_sim2.py'), 'probe', '8831', '1', '20', '20', 'runs=150&bot=greedy&mastery=1&potion=1&until=1051', 'sim_probe.html'])
subprocess.run([sys.executable, str(H / 'drive_sim2.py'), 'box', '8831', '1', '80', '20', 'runs=150&bot=greedy&mastery=1&potion=1&until=1051', 'sim_box.html'])