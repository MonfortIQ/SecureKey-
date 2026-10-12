"""Optimize project photography and generate a labeled inspection contact sheet."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
manifest = ROOT / 'assets/images/asset-manifest.json'
records = json.loads(manifest.read_text(encoding='utf-8'))
ready = []
for item in records:
    if not item.get('source') and not item.get('path'):
        continue
    source = Path(item['source']) if item.get('source') else ROOT / item['path']
    img = Image.open(source).convert('RGB')
    if item.get('source'):
        item['source_width'], item['source_height'] = img.size
    else:
        item.setdefault('source_width', img.width)
        item.setdefault('source_height', img.height)
    target = ROOT / f"assets/images/{item['id']}.webp"
    target.parent.mkdir(parents=True, exist_ok=True)
    if item.get('source'):
        img.save(target, 'WEBP', quality=84, method=6)
    item['path'] = target.relative_to(ROOT).as_posix()
    item['bytes'] = target.stat().st_size
    item.setdefault('license', 'AI-generated fictional demo photography using the built-in imagegen tool; no stock attribution required. Do not represent portraits as actual staff.')
    item['width'], item['height'] = img.size
    # A separate small responsive asset avoids loading the full image for card thumbnails.
    if item['id'].startswith(('services/', 'blog/')):
        card = img.copy()
        card.thumbnail((640, 640), Image.Resampling.LANCZOS)
        card_path = target.with_name(target.stem + '-card.webp')
        card.save(card_path, 'WEBP', quality=80, method=6)
        item['card_path'] = card_path.relative_to(ROOT).as_posix()
    ready.append(item)
manifest.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding='utf-8')
sheet = Image.new('RGB', (1000, ((len(ready)+3)//4)*190), '#e8edf4')
draw = ImageDraw.Draw(sheet)
for i, item in enumerate(ready):
    im = Image.open(ROOT/item['path'])
    thumb = ImageOps.fit(im, (238, 148), method=Image.Resampling.LANCZOS)
    x, y = (i%4)*250+6, (i//4)*190+6
    sheet.paste(thumb, (x,y))
    draw.text((x,y+154), item['id'], fill='#132541')
sheet.save(ROOT/'assets/images/asset-contact-sheet.jpg', quality=88)
print(json.dumps({'ready':len(ready), 'total_bytes':sum(x['bytes'] for x in ready), 'contact_sheet':'assets/images/asset-contact-sheet.jpg'}))
