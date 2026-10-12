"""Apply the curated image mapping without changing page content or service links."""
import html, json, re, textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'assets/images/asset-manifest.json').read_text(encoding='utf-8'))
records = {r['id']:r for r in manifest}

def image_tag(key, classes='', lazy=False, card=False):
    r=records[key]; src=r['card_path'] if card else r['path']
    width,height=(640,400) if card else (r['width'],r['height'])
    variants=f' srcset="{src} 640w, {r["path"]} {r["width"]}w" sizes="(min-width:1200px) 280px, (min-width:768px) 42vw, 85vw"' if card else ''
    return f'<img src="{src}"{variants} alt="{html.escape(r["alt"],quote=True)}" width="{width}" height="{height}" decoding="async" loading="{"lazy" if lazy else "eager"}"'+(f' class="{classes}"' if classes else '')+'/>'

major={'about.html':'about/company-hero','services.html':'services/services-hero','pricing.html':'pricing/quote-hero','blog.html':'blog/security-journal-hero'}
for filename,key in major.items():
    if key not in records: continue
    path=ROOT/filename; text=path.read_text(encoding='utf-8')
    if 'page-hero-layout' not in text:
        match=re.search(r'(<section\b[^>]*class="page-hero"[^>]*>)(.*?)(</section>)',text,re.S)
        body=re.search(r'(\s*<div class="container">)(.*)(\s*</div>\s*)',match[2],re.S)
        copy=textwrap.indent(textwrap.dedent(body[2]).strip(),'              ')
        content='\n        <div class="container">\n          <div class="page-hero-layout">\n            <div class="page-hero-copy">\n'+copy+'\n            </div>\n            <figure class="page-hero-photo">\n              '+image_tag(key)+'\n            </figure>\n          </div>\n        </div>\n      '
        text=text[:match.start()]+match[1]+content+match[3]+text[match.end():]
    text=re.sub(r'(<div class="page-hero-copy">\n)(.*?)(\n            </div>\n            <figure)',lambda m:m[1]+textwrap.indent(textwrap.dedent(m[2]).strip(),'              ')+m[3],text,flags=re.S)
    path.write_text(text,encoding='utf-8')

for path in ROOT.glob('service-*.html'):
    topic=path.stem.removeprefix('service-'); key='service-details/'+topic+'-hero'
    if key not in records: continue
    text=path.read_text(encoding='utf-8')
    text=re.sub(r'<img\b[^>]*src="assets/images/services/[^\"]+\.webp"[^>]*>',lambda _:image_tag(key,'w-100 object-fit-cover',lazy=True),text,count=1)
    path.write_text(text,encoding='utf-8')

path=ROOT/'index-2.html';text=path.read_text(encoding='utf-8')
for topic,new_key in {'smart-lock-installation':'home-2/smart-installation','smart-lock-upgrade':'home-2/retrofit-upgrade','keyless-entry':'home-2/keypad-entry','deadbolt-installation':'home-2/smart-deadbolt'}.items():
    if new_key not in records: continue
    text=re.sub(r'<img\b[^>]*src="assets/images/services/'+topic+r'-card\.webp"[^>]*>',lambda _:image_tag(new_key,lazy=True,card=True),text,count=1)
path.write_text(text,encoding='utf-8')

path=ROOT/'index.html'; text=path.read_text(encoding='utf-8')
for old,new in [('emergency-lock-repair','emergency-lock-repair-v2'),('emergency-rekeying','emergency-rekeying-v2')]:
    if 'home-1/'+new not in records: continue
    text=re.sub(r'<img\b[^>]*src="assets/images/home-1/'+old+r'-card\.webp"[^>]*>',lambda _:image_tag('home-1/'+new,lazy=True,card=True),text,count=1)
path.write_text(text,encoding='utf-8')

path=ROOT/'contact.html';text=path.read_text(encoding='utf-8')
start=text.find('            <div aria-hidden="true" class="hero-emblem">')
if start!=-1:
    end=text.index('\n          </div>',start)
    text=text[:start]+'            <figure class="contact-hero-photo">\n              '+image_tag('contact/service-call-hero')+'\n            </figure>'+text[end:]
path.write_text(text,encoding='utf-8')

path=ROOT/'404.html';text=path.read_text(encoding='utf-8')
match=re.search(r'<div aria-label="An illustrated front door with a missing key".*?</div>',text,re.S)
if match: text=text[:match.start()]+'<figure class="error-photo m-0">'+image_tag('utility/not-found-hero')+'</figure>'+text[match.end():]
path.write_text(text,encoding='utf-8')

# Responsive copies share their source identity and are not separate photographs.
for path in ROOT.glob('*.html'):
    text=path.read_text(encoding='utf-8')
    def responsive(match):
        tag=match[0]
        if 'srcset=' in tag: return tag
        src=re.search(r'src="([^"]+)"',tag)[1]
        r=next((r for r in records.values() if r.get('card_path')==src),None)
        if r: tag=tag.replace('src="'+src+'"','src="'+src+'" srcset="'+src+' 640w, '+r['path']+' '+str(r['width'])+'w" sizes="(min-width:1280px) 360px, (min-width:992px) 28vw, (min-width:768px) 42vw, 85vw"')
        return tag
    text=re.sub(r'<img\b[^>]*src="assets/images/[^\"]+-card\.webp"[^>]*>',responsive,text)
    text=re.sub(r'href="assets/css/site-shell.css(?:\?[^\"]*)?"','href="assets/css/site-shell.css?v=20261012-audit"',text)
    path.write_text(text,encoding='utf-8')
print('Updated major-page photos, 12 service-detail photos, four Home 2 cards, and two similar emergency scenes.')
