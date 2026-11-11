from pathlib import Path
from PIL import Image,ImageDraw,ImageEnhance,ImageFilter
exec((Path(__file__).parent/'build_reel.py').read_text().split('cuts=')[0])
bg=Image.open(R/'REPORTS/take1_frame.jpg').convert('RGB');bg=ImageEnhance.Brightness(bg).enhance(.52).convert('RGBA');ov=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(ov)
d.rectangle([0,0,W,620],fill=(11,11,13,235));d.rectangle([0,1380,W,H],fill=(11,11,13,240));d.rectangle([70,220,155,228],fill='#e8273b')
text(d,'VELTO STUDIOS / DEV DIARY',248,32,'#ccc',x=70,weight='700')
text(d,'KANPUR',335,133,'#fff',x=70);text(d,'VERSE',455,133,'#e8273b',x=70)
d.rounded_rectangle([70,660,410,755],radius=14,fill='#ffd23f');text(d,'PART 2',665,65,'#0b0b0d',x=105)
for j,s in enumerate(['अब कानपुर का','स्वैग भी गेम में!']):text(d,s,805+j*115,92,'#fff' if j==0 else '#ffd23f',x=70)
text(d,'GUTKA GAMEPLAY',1235,44,'#ffd23f',x=70);text(d,'+ KANPURI HINDI INTERACTIONS',1300,37,'#fff',x=70)
text(d,'REAL GAMEPLAY · EARLY BUILD',1470,32,'#ccc',center=True,weight='700');text(d,'अगला फीचर आप बताओ',1555,58,'#fff',center=True)
logo=Image.open(R/'PROJECT_FILES/velto-logo.png').convert('RGBA');logo.thumbnail((400,125));ov.alpha_composite(logo,((W-logo.width)//2,1690));bg.alpha_composite(ov);bg.convert('RGB').save(R/'COVER/KanpurVerse_Part2_Cover.jpg',quality=95)
