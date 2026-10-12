"""Import generated emergency-card photographs from a supplied JSON source list."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sources = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
manifest_path = ROOT / 'assets/images/asset-manifest.json'
prompts_path = ROOT / 'scripts/asset-prompts.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
prompts = json.loads(prompts_path.read_text(encoding='utf-8'))
for item in sources:
    source = Image.open(item['source']).convert('RGB')
    target = ROOT / 'assets/images' / (item['id'] + '.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    large = ImageOps.fit(source, (1280, 800), method=Image.Resampling.LANCZOS)
    large.save(target, 'WEBP', quality=84, method=6)
    card_path = target.with_name(target.stem + '-card.webp')
    large.resize((640, 400), Image.Resampling.LANCZOS).save(card_path, 'WEBP', quality=82, method=6)
    record = {'id': item['id'], 'alt': item['alt'], 'usage': 'index.html emergency service highlight card only',
              'source_width': source.width, 'source_height': source.height,
              'path': target.relative_to(ROOT).as_posix(), 'card_path': card_path.relative_to(ROOT).as_posix(),
              'width': 1280, 'height': 800, 'bytes': target.stat().st_size,
              'license': 'AI-generated fictional demo photography using the built-in imagegen tool; no stock attribution required.'}
    manifest = [r for r in manifest if r['id'] != item['id']] + [record]
    prompts = [r for r in prompts if r['id'] != item['id']] + [{'id': item['id'], 'prompt': item['prompt']}]
    print(f"Imported {item['id']}: {source.width}x{source.height} source, {card_path.stat().st_size:,}-byte card")
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
prompts_path.write_text(json.dumps(prompts, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
