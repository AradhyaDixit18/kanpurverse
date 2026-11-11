from pathlib import Path
import subprocess,json,math,re,sys,wave
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageEnhance,ImageFilter
R=Path(__file__).resolve().parents[1];P=Path('/Users/aradhyadixit_74/Desktop/VeltoStudios/Third_Instagram_Reel_KanpurVerse');FF='/Users/aradhyadixit_74/Desktop/VeltoStudios/.tools/bin/ffmpeg';W,H,FPS=1080,1920,30
F=R/'PROJECT_FILES/fonts'; cache={}
def font(script,size,weight='800'):
 key=(script,size,weight)
 if key not in cache:cache[key]=ImageFont.truetype(str(F/f'Mukta-{script}-{weight}.ttf'),size,layout_engine=ImageFont.Layout.RAQM)
 return cache[key]
def runs(s):
 return re.findall(r'[\u0900-\u097f\s]+|[^\u0900-\u097f\s]+|\s+',s)
from shaped_text import width as measure, draw as text
def wrap(s,size,maxw=900):
 out=['']
 for w in s.split():
  trial=(out[-1]+' '+w).strip()
  if measure(trial,size)>maxw and out[-1]:out.append(w)
  else:out[-1]=trial
 return out
cuts=[(R/'RAW_FOOTAGE/previous/mall_fp.webm',1,2.8),(R/'RAW_FOOTAGE/previous/phatak_walk.webm',1,3),(R/'RAW_FOOTAGE/previous/mall_orbit.webm',0,2.6),(R/'RAW_FOOTAGE/street-1794390939665.webm',0,2.6),(R/'RAW_FOOTAGE/street-1794390939665.webm',4.5,3.5),(R/'RAW_FOOTAGE/street-1794390939665.webm',8,3),(R/'RAW_FOOTAGE/street-1794390939665.webm',13,5.7),(R/'RAW_FOOTAGE/street-1794391010884.webm',0,4.3),(R/'RAW_FOOTAGE/street-1794391010884.webm',4,3.5),(R/'RAW_FOOTAGE/street-1794391045701.webm',2,4.6),(R/'RAW_FOOTAGE/street-1794391203435.webm',0,3.4),(R/'RAW_FOOTAGE/previous/auto_drive.webm',2,4.1),(R/'RAW_FOOTAGE/previous/mall_orbit.webm',5,2.4),(R/'RAW_FOOTAGE/previous/mall_orbit.webm',0,5.5)]
# Frame-accurate cut list; all source imagery is recorded KanpurVerse gameplay.
(R/'PROJECT_FILES/edit_decisions.json').write_text(json.dumps([{'file':str(p),'in':t,'duration':dur,'outStart':round(sum(c[2] for c in cuts[:i]),2)} for i,(p,t,dur) in enumerate(cuts)],indent=2))
TMP=R/'PROJECT_FILES/render';TMP.mkdir(exist_ok=True)
if '--base' in sys.argv:
 for i,(p,start,dur) in enumerate(cuts):
  out=TMP/f'cut_{i:02}.mp4'
  subprocess.run([FF,'-v','error','-y','-ss',str(start),'-i',str(p),'-t',str(dur),'-an','-vf','scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',str(out)],check=True)
 (TMP/'concat.txt').write_text(''.join("file '"+str(TMP/f'cut_{i:02}.mp4')+"'\n" for i in range(len(cuts))))
 subprocess.run([FF,'-v','error','-y','-f','concat','-safe','0','-i',str(TMP/'concat.txt'),'-c','copy',str(TMP/'base.mp4')],check=True)
 print('base ready',flush=True)
 if '--only-base' in sys.argv:sys.exit()
caps=json.loads((R/'SUBTITLES/captions.json').read_text())
# Original instrumental bed: soft synth ostinato, warm bass and restrained percussion. No third-party music.
if not (TMP/'music.wav').exists():
 sr=48000;n=int(51*sr);song=np.zeros(n,dtype=np.float32);rng=np.random.default_rng(42);beat=60/108
 def add(t,signal,gain):
  a=int(t*sr);b=min(n,a+len(signal));song[a:b]+=signal[:b-a]*gain
 for beatn in range(92):
  pos=beatn*beat
  if pos>=51:break
  t=np.arange(int(sr*.22))/sr;add(pos,np.sin(2*np.pi*(48*t+45*.025*(1-np.exp(-t/.025))))*np.exp(-t*22),.24)
  if beatn%2:
   t=np.arange(int(sr*.13))/sr;add(pos,rng.normal(0,1,len(t))*np.exp(-t*35),.045)
  for half in [0,.5]:
   t=np.arange(int(sr*.06))/sr;add(pos+half*beat,rng.normal(0,1,len(t))*np.exp(-t*90),.012)
  note=[146.83,174.61,220,130.81,146.83,174.61,261.63,220][beatn%8];t=np.arange(int(sr*.6))/sr
  add(pos,np.sin(2*np.pi*note*t)*np.exp(-t*5)+.25*np.sin(2*np.pi*note*2*t)*np.exp(-t*8),.07)
 song*=np.minimum(1,np.arange(n)/(sr*.8))*np.minimum(1,(n-np.arange(n))/(sr*1.5))
 with wave.open(str(TMP/'music.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(song,-1,1)*32767).astype('<i2').tobytes())
subprocess.run([sys.executable,str(R/'PROJECT_FILES/make_sfx.py')],check=True)
subprocess.run([FF,'-v','error','-y','-i',str(R/'VOICEOVER/KanpurVerse_Part2_Hindi_Aligned.mp3'),'-i',str(TMP/'music.wav'),'-i',str(TMP/'sfx.wav'),'-filter_complex','[1:a]volume=0.32[b];[2:a]volume=0.65[c];[0:a][b][c]amix=inputs=3:duration=first,loudnorm=I=-14:TP=-1.2:LRA=8[a]','-map','[a]',str(TMP/'mix.wav')],check=True)
# Reusable opacity gradients leave the game visible while protecting typography.
grad=np.zeros((H,W,4),dtype=np.uint8)
for y in range(H):
 a=238 if y<350 else max(0,220*(1-(y-350)/260)) if y<610 else max(0,min(235,(y-1320)*.7))
 grad[y,:,3]=int(a)
grad=Image.fromarray(grad)
def overlay(base,t):
 base=base.convert('RGBA');base.alpha_composite(grad);d=ImageDraw.Draw(base)
 d.rectangle([64,104,116,112],fill='#e8273b');text(d,'VELTO STUDIOS  /  DEV DIARY 02',86,30,'#d5d6dc',x=138,weight='700')
 if t<5.8:lines=['अब कानपुर का स्वैग','भी गेम में!'];eyebrow='KANPURVERSE — PART 2'
 elif t<11:lines=['नए आइडियाज़।','और कनपुरिया अंदाज़।'];eyebrow='NEW IDEAS. MORE KANPUR FLAVOUR.'
 elif t<23.2:lines=['नुक्कड़ पान दुकान','से शहर की सफ़ाई तक।'];eyebrow='01 / GUTKA GAMEPLAY'
 elif t<35.6:lines=['बात भी कनपुरिया!'];eyebrow='02 / HINDI NPC INTERACTIONS'
 elif t<43.1:lines=['ये तो बस शुरुआत है।'];eyebrow='EXPLORE. DRIVE. BUILD WITH US.'
 else:lines=['अगला फीचर','आप बताओ।'];eyebrow='COMMENT YOUR IDEA'
 text(d,eyebrow,160,35,'#ffd23f',weight='700')
 for j,s in enumerate(lines):text(d,s,220+j*88,76,'#fff' if j==0 else '#ffd23f')
 # Thin programme progress motif from Part 1.
 d.rectangle([64,450,1016,453],fill='#ffffff33');d.rectangle([64,450,64+952*t/51,453],fill='#e8273b')
 text(d,'REAL GAMEPLAY  /  EARLY BUILD',480,26,'#d2d2d8',weight='700')
 c=next((c for c in caps if c['start']<=t<c['end']),None)
 if c:
  ls=wrap(c['text'],51,908)
  for j,s in enumerate(ls):text(d,s,1500+j*64,51,'#fff',center=True,weight='700')
 if 11<=t<23.2:text(d,'काल्पनिक गेमप्ले • तंबाकू सेवन हानिकारक है',1740,29,'#d6c89f',center=True,weight='500')
 if 23.2<=t<35.6:text(d,'हँसी-मज़ाक · नाराज़गी · माफ़ी · साफ़ भाषा विकल्प',1740,28,'#d6c89f',center=True,weight='500')
 if t>=46.3:
  d.rounded_rectangle([70,820,1010,1205],radius=28,fill=(11,11,13,230),outline='#e8273b',width=3)
  text(d,'KANPUR',880,112,'#fff',x=142);text(d,'VERSE',990,112,'#e8273b',x=142)
  text(d,'BY VELTO STUDIOS',1140,34,'#ffd23f',x=142,weight='700')
 text(d,'@velto_studios',1810,30,'#d2d2d8',center=True,weight='700')
 return base.convert('RGB')
if '--preview' in sys.argv:
 frames=[]
 for t in [1,6.5,12,15.5,20,25,29,33,38,44,48,50]:
  p=subprocess.run([FF,'-v','error','-ss',str(t),'-i',str(TMP/'base.mp4'),'-frames:v','1','-f','image2pipe','-c:v','mjpeg','-'],capture_output=True,check=True)
  import io
  im=overlay(Image.open(io.BytesIO(p.stdout)),t);frames.append(im.resize((270,480)))
 sheet=Image.new('RGB',(1080,1440),'#0b0b0d')
 for i,im in enumerate(frames):sheet.paste(im,((i%4)*270,(i//4)*480))
 sheet.save(R/'REPORTS/final_contact.jpg',quality=90);sys.exit()
reader=subprocess.Popen([FF,'-v','error','-i',str(TMP/'base.mp4'),'-vf','tpad=stop_mode=clone:stop_duration=1,fps=30','-t','51','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
enc=subprocess.Popen([FF,'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1920','-r','30','-i','-','-i',str(TMP/'mix.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','51','-movflags','+faststart',str(R/'EXPORTS/KanpurVerse_Part2_StreetLife_1080x1920.mp4')],stdin=subprocess.PIPE)
for i in range(1530):
 data=reader.stdout.read(W*H*3)
 if len(data)<W*H*3:raise RuntimeError(f'Source ended at frame {i}')
 im=overlay(Image.frombytes('RGB',(W,H),data),i/30);enc.stdin.write(im.tobytes())
 if i in [30,375,465,600,750,990,1440]:im.save(R/f'REPORTS/verified_frame_{i:04}.jpg',quality=93)
 if i%300==0:print('render',i,'/1530',flush=True)
enc.stdin.close();enc.wait();reader.wait();assert enc.returncode==0
print('finished',flush=True)
