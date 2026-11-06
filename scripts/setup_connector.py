"""Prepare a self-contained Python runtime for the desktop bundle."""
import subprocess, shutil, os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
uv=shutil.which('uv')
if not uv: raise SystemExit('Install uv first: https://docs.astral.sh/uv/')
subprocess.run([uv,'python','install','3.12.13','--no-bin','--no-registry','--install-dir',str(root/'runtime/python')],check=True)
# uv's version aliases must remain inside a relocatable app bundle.
for alias in (root/'runtime/python').iterdir():
    if alias.is_symlink() and alias.readlink().is_absolute():
        target=alias.readlink().name
        alias.unlink(); alias.symlink_to(target)
pattern='cpython-*-windows-*/python.exe' if os.name=='nt' else 'cpython-*-macos-*/bin/python3.12'
python=next((root/'runtime/python').glob(pattern))
subprocess.run([uv,'pip','install','--python',str(python),'--target',str(root/'runtime/site'),'-r',str(root/'scripts/connector-requirements.txt')],check=True)
print('Desktop connector runtime ready.')
