from pathlib import Path
import asyncio,json,subprocess,wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
FF='/Users/aradhyadixit_74/Desktop/VeltoStudios/.tools/bin/ffmpeg'
scenes=[
['पिछली रील में पूछा था, कानपुर को गेम में क्या-क्या देखना चाहिए? अब देखो पार्ट टू!',5.8],
['हमारे नए आइडियाज़ से, कानपुरवर्स में आ रहा है थोड़ा और कनपुरिया अंदाज़!',5.2],
['नुक्कड़ की पान दुकान पर जाओ, सिक्कों से पैकेट खरीदो। गुटखा वाला गेमप्ले भी तैयार! लेकिन सड़क पर थूका, तो नागरिक स्कोर घटेगा। आसपास के लोग भी टोकेंगे!',12.2],
['और अब एन पी सी से सिर्फ हेलो नहीं। का गुरु, बड़ी जल्दी में हो? मज़ेदार कनपुरिया जवाब, नाराज़गी, और माफ़ी से बात सँभालना। साफ़ भाषा का विकल्प भी है!',12.4],
['ये अर्ली बिल्ड है, बस शुरुआत है। आगे के फीचर्स और मिशन्स को आकार देने में, आपके आइडियाज़ काम आएँगे।',7.5],
['अगला फीचर क्या होना चाहिए? कमेंट करो! कानपुरवर्स, वेल्टो स्टूडियोज़ की तरफ़ से। शहर हमारा, बनाएँगे मिलकर!',7.9],
]
(ROOT/'VOICEOVER/script_hi.json').write_text(json.dumps(scenes,ensure_ascii=False,indent=2))
async def edge_test(voice):
 import edge_tts
 try:
  data=await asyncio.wait_for(edge_tts.Communicate('का गुरु, कानपुरवर्स में स्वागत है!',voice).save(str(ROOT/f'VOICEOVER/audition_{voice}.mp3')),timeout=18)
  return True
 except Exception as e: return str(e)
results={}
for voice in ['hi-IN-MadhurNeural','hi-IN-SwaraNeural']:
 results[voice]=asyncio.run(edge_test(voice)); print(voice,results[voice],flush=True)
# Retain previous reel's available offline Hindi male voice; generate measured per-scene takes.
from kokoro_onnx import Kokoro
K=Path('/Users/aradhyadixit_74/Desktop/VeltoStudios/assets/voices/kokoro')
k=Kokoro(str(K/'kokoro-v1.0.fp32.onnx'),str(K/'voices-v1.0.bin'))
from kokoro_onnx.tokenizer import Tokenizer
import re
tok=Tokenizer(); timeline=[]; start=0;parts=[]
for i,(text,duration) in enumerate(scenes):
 ph=re.sub(r'\((?:en|hi|en-us|en-gb)\)','',tok.phonemize(text,lang='hi'))
 sig,sr=k.create(ph,voice='hm_omega',speed=1.04,is_phonemes=True)
 raw=ROOT/f'VOICEOVER/scene_{i+1}_raw.wav'
 with wave.open(str(raw),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(sig,-1,1)*32767).astype('<i2').tobytes())
 actual=len(sig)/sr; factor=actual/(duration-.16);out=ROOT/f'VOICEOVER/scene_{i+1}.wav'
 subprocess.run([FF,'-v','error','-y','-i',str(raw),'-af',f'atempo={factor},apad','-t',str(duration),'-ar','48000',str(out)],check=True)
 timeline.append({'scene':i+1,'start':start,'end':start+duration,'text':text,'raw_duration':actual,'tempo':factor});start+=duration;parts.append(out)
 print(i+1,actual,'target',duration,flush=True)
(ROOT/'VOICEOVER/concat.txt').write_text(''.join("file '"+str(p)+"'\n" for p in parts))
subprocess.run([FF,'-v','error','-y','-f','concat','-safe','0','-i',str(ROOT/'VOICEOVER/concat.txt'),'-af','highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=9','-c:a','libmp3lame','-b:a','192k',str(ROOT/'VOICEOVER/KanpurVerse_Part2_Hindi.mp3')],check=True)
(ROOT/'VOICEOVER/timeline.json').write_text(json.dumps({'duration':start,'scenes':timeline,'auditions':results,'voice':'hm_omega offline Kokoro; same as previous reel'},ensure_ascii=False,indent=2))
