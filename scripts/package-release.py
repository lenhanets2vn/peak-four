"""Package deployable source without confusing runtime data with src/data."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
excluded = {'node_modules', 'dist', '.git', '.venv', '__pycache__', '.pytest_cache'}
required = ['package.json', 'package-lock.json', 'Dockerfile', 'server.ts',
            'src/data/defaultConfig.ts', 'src/data/defaultKnowledge.ts']
args.output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(args.output, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(root.rglob('*')):
        relative = file.relative_to(root)
        if not file.is_file() or any(part in excluded for part in relative.parts):
            continue
        # Only the project-root data directory contains runtime/customer records.
        if relative.parts[0] == 'data':
            continue
        if file.name.startswith('.env') and file.name != '.env.example':
            continue
        if file.name in {'firebase-applet-config.json','service-account.json','credentials.json'}:
            continue
        if file.suffix in {'.db', '.sqlite', '.pyc', '.log', '.zip'}:
            continue
        archive.write(file, Path('src') / relative)
with ZipFile(args.output) as archive:
    assert archive.testzip() is None, 'Corrupt ZIP entry'
    for file in required:
        assert f'src/{file}' in archive.namelist(), f'Missing required source: {file}'
print(args.output.resolve())
