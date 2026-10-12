"""Static HTML, internal-link, form, and local-image audit for the template."""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
from urllib.parse import urlsplit,unquote
import json,re,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=[];self.refs=[];self.links=[];self.images=[];self.files=[];self.forms=[];self.title='';self.description='';self.h1=0;self.in_title=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='h1':self.h1+=1
  if tag=='title':self.in_title=True
  if tag=='meta' and a.get('name')=='description':self.description=a.get('content','')
  if tag=='a':self.links.append(a.get('href',''))
  if tag=='img':self.images.append(a)
  if tag=='form':self.forms.append(a)
  for k in ['for','aria-labelledby','aria-describedby','aria-controls']:
   if k in a:self.refs.extend(a[k].split())
  for k in ['src','href']:
   if k in a and not a[k].startswith(('http:','https:','data:','tel:','mailto:','javascript:')):self.files.append(a[k])
 def handle_endtag(self,tag):
  if tag=='title':self.in_title=False
 def handle_data(self,data):
  if self.in_title:self.title+=data
pages={}
for p in ROOT.glob('*.html'):
 obj=Page();obj.feed(p.read_text(encoding='utf-8'));pages[p.name]=obj
errors=[]
for name,page in pages.items():
 if page.h1!=1:errors.append(f'{name}: expected one H1')
 if not page.description:errors.append(f'{name}: missing description')
 if any(v>1 for v in Counter(page.ids).values()):errors.append(f'{name}: duplicate IDs')
 if set(page.refs)-set(page.ids):errors.append(f'{name}: missing label/ARIA IDs {set(page.refs)-set(page.ids)}')
 for value in page.files:
  parts=urlsplit(value);target=unquote(parts.path) or name
  if not (ROOT/target).is_file():errors.append(f'{name}: missing local file {value}')
  elif parts.fragment and target.endswith('.html') and parts.fragment not in pages[target].ids:errors.append(f'{name}: missing fragment {value}')
  elif value.startswith('#') and parts.fragment not in page.ids:errors.append(f'{name}: missing fragment {value}')
 for image in page.images:
  if not image.get('alt'):errors.append(f'{name}: missing image alt')
  if not image.get('width') or not image.get('height'):errors.append(f'{name}: missing image dimensions')
  if image.get('src','').startswith('http'):errors.append(f'{name}: remote image')
 if any('dashboard' in n.lower() or 'admin' in n.lower() for n in [name]):errors.append(f'{name}: forbidden dashboard page')
 if 'â€' in (ROOT/name).read_text(encoding='utf-8'):errors.append(f'{name}: mojibake text')
if len(set(p.title for p in pages.values()))!=len(pages):errors.append('Duplicate page titles')
if len(set(p.description for p in pages.values()))!=len(pages):errors.append('Duplicate page descriptions')
contact=next(f for f in pages['contact.html'].forms if f.get('id')=='contactForm')
if contact.get('action')!='https://formsubmit.co/YOUR-EMAIL@example.com' or contact.get('method')!='POST':errors.append('Missing FormSubmit contract')
manifest=json.loads((ROOT/'assets/images/asset-manifest.json').read_text(encoding='utf-8'))
image_sizes=[];hashes=set()
for image in manifest:
 for key in ['path','card_path']:
  if key not in image:continue
  p=ROOT/image[key]
  if not p.is_file():errors.append('Missing image: '+str(p));continue
  with Image.open(p) as im:
   im.load()
   if key=='path' and im.size!=(image['width'],image['height']):errors.append('Incorrect image metadata '+str(p))
   if key=='card_path' and im.width!=640:errors.append('Incorrect card width '+str(p))
   image_sizes.append({'path':image[key],'width':im.width,'height':im.height,'bytes':p.stat().st_size})
  digest=hashlib.sha256(p.read_bytes()).hexdigest()
  if digest in hashes:errors.append('Duplicated image bytes '+str(p))
  hashes.add(digest)
report={'pages':len(pages),'service_pages':len([p for p in pages if p.startswith('service-')]),'blog_articles':len([p for p in pages if p.startswith('blog-details-')]),'images':len(image_sizes),'total_image_bytes':sum(i['bytes'] for i in image_sizes),'errors':errors,'image_resolution_note':'Two stock sources have native 3888×2592 and 5516×3421 dimensions and 1920px web exports. Generated scenes have native 1672×941, 1536×1024, or 1586×992 dimensions; their native 1920px/4K target is not met. No artificial upscaling is claimed.','image_sizes':image_sizes}
(ROOT/'qa-artifacts').mkdir(exist_ok=True)
(ROOT/'qa-artifacts/static-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='image_sizes'},indent=2,ensure_ascii=False))
raise SystemExit(bool(errors))
