"""Import distinct generated photographs and record their actual source dimensions."""
import json, sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
records = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
manifest_path = ROOT/'assets/images/asset-manifest.json'
prompts_path = ROOT/'scripts/asset-prompts.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
prompts = json.loads(prompts_path.read_text(encoding='utf-8'))
for item in records:
    with Image.open(item['source']) as opened:
        original = opened.convert('RGB')
    target = ROOT/'assets/images'/f"{item['id']}.webp"
    target.parent.mkdir(parents=True, exist_ok=True)
    # Preserve native detail for heroes; never upscale sources.
    width = min(1920, original.width)
    height = round(width*original.height/original.width)
    export = original.resize((width,height),Image.Resampling.LANCZOS)
    export.save(target,'WEBP',quality=84,method=6)
    record = {'id':item['id'],'path':target.relative_to(ROOT).as_posix(),'alt':item['alt'],'usage':item['usage'],
              'source_width':original.width,'source_height':original.height,'width':width,'height':height,
              'bytes':target.stat().st_size,'license':'AI-generated fictional demo photograph using the built-in imagegen tool; no stock attribution required.'}
    if item['id'].startswith(('home-1/','home-2/')):
        card_path=target.with_name(target.stem+'-card.webp')
        ImageOps.fit(original,(640,400),method=Image.Resampling.LANCZOS).save(card_path,'WEBP',quality=82,method=6)
        record['card_path']=card_path.relative_to(ROOT).as_posix()
    manifest=[r for r in manifest if r['id']!=item['id']]+[record]
    prompts=[r for r in prompts if r['id']!=item['id']]+[{'id':item['id'],'prompt':item['prompt']}]
    print(f"{item['id']}: source {original.width}x{original.height}, web {width}x{height}")
manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
prompts_path.write_text(json.dumps(prompts,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
