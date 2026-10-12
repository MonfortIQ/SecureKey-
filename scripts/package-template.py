"""Package only distributable template files and the final QA evidence."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parent.parent
archive=ROOT/'SecureKey-Locksmith-Template.zip'
files=list(ROOT.glob('*.html'))+[ROOT/'README.md',ROOT/'favicon.ico']
files+=list((ROOT/'assets').rglob('*'))+list((ROOT/'partials').glob('*.html'))
files+=list((ROOT/'scripts').glob('*.py'))+list((ROOT/'scripts').glob('*.mjs'))+list((ROOT/'scripts').glob('*.json'))
files+=list((ROOT/'qa-artifacts').glob('*report.json'))
if (ROOT/'qa-artifacts/QA-SUMMARY.md').exists():files.append(ROOT/'qa-artifacts/QA-SUMMARY.md')
if (ROOT/'qa-artifacts/IMAGE-MAPPING.md').exists():files.append(ROOT/'qa-artifacts/IMAGE-MAPPING.md')
files=[p for p in files if p.is_file() and '__pycache__' not in p.parts]
with ZipFile(archive,'w',ZIP_DEFLATED,compresslevel=8) as bundle:
 for p in sorted(set(files)):
  bundle.write(p,'SecureKey-Locksmith/'+p.relative_to(ROOT).as_posix())
with ZipFile(archive) as bundle:
 assert bundle.testzip() is None
 assert len([f for f in bundle.namelist() if f.endswith('.html') and f.count('/')==1])==36
 assert 'SecureKey-Locksmith/assets/images/asset-manifest.json' in bundle.namelist()
print(f'Archive verified: {archive.name} ({archive.stat().st_size:,} bytes, {len(files)} files).')
