# usage: python3 sheet2.py prefix count cols out.png [labels.json]
import sys,json
from PIL import Image, ImageDraw
pre,n,cols,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]
labels=json.load(open(sys.argv[5])) if len(sys.argv)>5 else None
ims=[Image.open(f'{pre}{i}.png').convert('RGB') for i in range(n)]
w,h=ims[0].size; rows=(n+cols-1)//cols
sh=Image.new('RGB',(w*cols,h*rows),(20,20,20)); d=ImageDraw.Draw(sh)
for i,im in enumerate(ims):
    x,y=(i%cols)*w,(i//cols)*h; sh.paste(im,(x,y))
    if labels: 
        for j,t in enumerate(labels[i].split('|')): d.text((x+4,y+4+j*11),t[:44],fill=(255,240,120))
sh.save(out)
