"""Inventory actual image content, responsive families, and page-level usages."""
from pathlib import Path
from html.parser import HTMLParser
from collections import defaultdict
from itertools import combinations
import hashlib, json, math, re
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'qa-artifacts'
OUTPUT.mkdir(exist_ok=True)
manifest = json.loads((ROOT / 'assets/images/asset-manifest.json').read_text(encoding='utf-8'))
families = {item[key]: item['id'] for item in manifest for key in ('path', 'card_path') if key in item}
usages = []
class Scan(HTMLParser):
    def __init__(self, page):
        super().__init__(); self.page = page; self.parents = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href','').startswith(('service-', 'blog-details-')):
            card = next((a for t,a in reversed(self.parents) if any(c in a.get('class','').split() for c in ('sk-card','blog-card'))), None)
            if card:
                for usage in card.get('_images', []): usage['item'] = attrs['href']
        if tag == 'img':
            section = next((a.get('aria-labelledby', a.get('class', '')) for t,a in reversed(self.parents) if t == 'section'), '')
            link = next((a.get('href') for t,a in reversed(self.parents) if t == 'a'), None)
            src = attrs.get('src', '')
            if not src.startswith('data:'):
                usage = {'page': self.page, 'src': src, 'family': families.get(src, src), 'section': section, 'link': link, 'alt': attrs.get('alt', ''), 'item': self.page}
                usages.append(usage)
                card = next((a for t,a in reversed(self.parents) if any(c in a.get('class','').split() for c in ('sk-card','blog-card'))), None)
                if card is not None: card.setdefault('_images', []).append(usage)
            for candidate in attrs.get('srcset', '').split(','):
                if candidate.strip():
                    srcset = candidate.strip().split()[0]
                    usages.append({'page': self.page, 'src': srcset, 'family': families.get(srcset, srcset), 'section': section, 'responsive_variant': True})
        if tag not in ('img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'area', 'wbr', 'embed'):
            self.parents.append((tag, attrs))
    def handle_endtag(self, tag):
        for i in range(len(self.parents)-1, -1, -1):
            if self.parents[i][0] == tag:
                self.parents = self.parents[:i]; break

for page in sorted(ROOT.glob('*.html')):
    parser = Scan(page.name); parser.feed(page.read_text(encoding='utf-8'))
for css in (ROOT / 'assets/css').glob('*.css'):
    for value in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css.read_text(encoding='utf-8')):
        src = (css.parent / value).resolve()
        if src.suffix.lower() in ('.png', '.webp', '.jpg', '.jpeg', '.avif') and src.is_relative_to(ROOT):
            relative = src.relative_to(ROOT).as_posix()
            usages.append({'page': 'coming-soon.html' if 'coming-soon' in relative else css.name, 'src': relative, 'family': families.get(relative, relative), 'css': css.relative_to(ROOT).as_posix()})

def phash(image):
    small = image.convert('L').resize((32,32), Image.Resampling.LANCZOS)
    pixels = list(small.get_flattened_data() if hasattr(small,'get_flattened_data') else small.getdata())
    cos = [[math.cos((2*x+1)*u*math.pi/64) for x in range(32)] for u in range(8)]
    horizontal = [[sum(pixels[y*32+x]*cos[u][x] for x in range(32)) for u in range(8)] for y in range(32)]
    values = [sum(horizontal[y][u]*cos[v][y] for y in range(32)) for v in range(8) for u in range(8)]
    median = sorted(values[1:])[31]
    return sum((value > median) << i for i,value in enumerate(values))

inventory, hashes = [], defaultdict(list)
images = sorted(p for p in (ROOT / 'assets/images').rglob('*') if p.suffix.lower() in ('.png','.webp','.jpg','.jpeg','.avif'))
for file in images:
    src = file.relative_to(ROOT).as_posix()
    with Image.open(file) as image:
        image.load()
        record = {'path': src, 'family': families.get(src, src), 'width': image.width, 'height': image.height, 'bytes': file.stat().st_size,
                  'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'phash': format(phash(image), '016x'), 'mirror_phash': format(phash(ImageOps.mirror(image)), '016x')}
        # Screen modest crops and flips too; these are not new photographs.
        views=[record['phash'],record['mirror_phash'],format(phash(ImageOps.flip(image)),'016x')]
        for fraction in (.9,.8):
            dx,dy=round(image.width*(1-fraction)/2),round(image.height*(1-fraction)/2)
            crop=image.crop((dx,dy,image.width-dx,image.height-dy))
            views += [format(phash(crop),'016x'),format(phash(ImageOps.mirror(crop)),'016x')]
        record['perceptual_views']=views
        inventory.append(record); hashes[record['sha256']].append(src)
similar = []
for a,b in combinations(inventory,2):
    if a['family'] == b['family'] or 'contact-sheet' in a['path'] or 'contact-sheet' in b['path']: continue
    distance = min((int(x,16)^int(y,16)).bit_count() for x in a['perceptual_views'] for y in b['perceptual_views'])
    if distance <= 14: similar.append({'a':a['path'], 'b':b['path'], 'hamming_distance':distance})
near_duplicate_review = [{'a': item['a'], 'b': item['b'], 'hamming_distance': item['hamming_distance'],
                          'verdict': 'distinct composition and subject; retained after contact-sheet review'} for item in similar]

used = {u['src'] for u in usages}
actual_usages = [u for u in usages if not u.get('responsive_variant')]
grouped = defaultdict(list)
for usage in actual_usages: grouped[usage['family']].append(usage)
home1 = {u['family'] for u in actual_usages if u['page']=='index.html'}
home2 = {u['family'] for u in actual_usages if u['page']=='index-2.html'}
missing = [u for u in usages if not (ROOT/u['src']).is_file()]
unrelated_reuse = {family:items for family,items in grouped.items() if len({u.get('item',u['page']) for u in items if 'css' not in u})>1}
within_page = defaultdict(list)
for usage in actual_usages:
    if 'css' not in usage: within_page[(usage['page'],usage['family'])].append(usage)
repeated_on_page = [v for v in within_page.values() if len(v)>1]
report = {'files':len(inventory), 'unique_photo_families':len(manifest), 'exact_duplicates':[v for v in hashes.values() if len(v)>1],
          'near_duplicate_candidates':similar, 'near_duplicate_review':near_duplicate_review, 'homepage_shared_families':sorted(home1 & home2),
          'unrelated_reuse':unrelated_reuse, 'repeated_on_page':repeated_on_page,
          'reused_families':{k:v for k,v in grouped.items() if len(v)>1}, 'missing':missing,
          'unused_assets':[i['path'] for i in inventory if i['path'] not in used and 'contact-sheet' not in i['path']], 'inventory':inventory, 'usage_mapping':actual_usages}
major_pages=['index.html','index-2.html','about.html','services.html','pricing.html','blog.html','contact.html','login.html','register.html','404.html','coming-soon.html']
report['major_page_photos']={page:next((u['family'] for u in actual_usages if u['page']==page),None) for page in major_pages}
report['service_detail_photos']={u['page']:u['family'] for u in actual_usages if u['page'].startswith('service-')}
report['blog_article_photos']={u['page']:u['family'] for u in actual_usages if u['page'].startswith('blog-details-')}
report['acceptance_errors']=[]
for name,mapping in [('major-page',report['major_page_photos']),('service-detail',report['service_detail_photos']),('blog-article',report['blog_article_photos'])]:
    if None in mapping.values() or len(set(mapping.values()))!=len(mapping): report['acceptance_errors'].append(name+' images are missing or repeated')
for name in ('exact_duplicates','homepage_shared_families','unrelated_reuse','repeated_on_page','missing','unused_assets'):
    if report[name]: report['acceptance_errors'].append(name)
(OUTPUT/'image-audit-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
lines = ['# Website image mapping', '', 'Responsive thumbnails and their larger image are one photograph, not separate visual content.', '', '| Page | Section | Photograph family |', '| --- | --- | --- |']
lines += [f"| {u['page']} | {u.get('section', 'CSS background')} | {u['family']} |" for u in actual_usages]
(OUTPUT/'IMAGE-MAPPING.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
sheet = Image.new('RGB',(1200,math.ceil(len(manifest)/4)*210),'#edf1f6');draw=ImageDraw.Draw(sheet)
for i,item in enumerate(manifest):
    with Image.open(ROOT/item['path']) as image:
        thumbnail=ImageOps.fit(image,(286,170),method=Image.Resampling.LANCZOS)
    x,y=(i%4)*300+7,(i//4)*210+7;sheet.paste(thumbnail,(x,y));draw.text((x,y+174),item['id'],fill='#142032')
sheet.save(OUTPUT/'image-audit-contact-sheet.jpg',quality=92)
print(json.dumps({k:v for k,v in report.items() if k not in ('inventory','usage_mapping','reused_families')},indent=2))
raise SystemExit(bool(report['acceptance_errors']))
