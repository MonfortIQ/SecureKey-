"""Fetch the published font files and accompanying upstream licenses once."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
import re,hashlib

root=Path(__file__).resolve().parent.parent
fontdir=root/'assets/fonts';fontdir.mkdir(parents=True,exist_ok=True)
def fetch(url):
    request=Request(url,headers={'User-Agent':'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'})
    with urlopen(request,timeout=45) as response:return response.read()
css=fetch('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap').decode('utf-8')
urls=sorted(set(re.findall(r'url\((https://[^)]+)\)',css)))
for url in urls:
    suffix=Path(urlparse(url).path).suffix
    filename=hashlib.sha256(url.encode()).hexdigest()[:12]+suffix
    (fontdir/filename).write_bytes(fetch(url))
    css=css.replace(url,'../fonts/'+filename)
(root/'assets/css/fonts.css').write_text(css,encoding='utf-8')
licenses={
 'PLUS-JAKARTA-SANS-OFL.txt':'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/OFL.txt',
 'OUTFIT-OFL.txt':'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/OFL.txt',
 'BOOTSTRAP-LICENSE.txt':'https://raw.githubusercontent.com/twbs/bootstrap/v5.3.3/LICENSE',
 'BOOTSTRAP-ICONS-LICENSE.txt':'https://raw.githubusercontent.com/twbs/icons/v1.11.3/LICENSE'
}
for name,url in licenses.items():(fontdir/name).write_bytes(fetch(url))
p=root/'assets/css/style.css'
s=p.read_text(encoding='utf-8');s=re.sub(r'@import url\([^\n]+\);',"@import url('fonts.css');",s,count=1);p.write_text(s,encoding='utf-8')
icons=root/'assets/css/bootstrap-icons.min.css';s=icons.read_text(encoding='utf-8');s=re.sub(r',url\("fonts/bootstrap-icons\.woff\?[^\"]+"\) format\("woff"\)','',s);icons.write_text(s,encoding='utf-8')
print(f'Saved {len(urls)} local font files and four upstream licenses.')
