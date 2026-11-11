from pathlib import Path
import json,subprocess,wave,re
import numpy as np
from kokoro_onnx import Kokoro
from kokoro_onnx.tokenizer import Tokenizer
R=Path(__file__).resolve().parents[1];K=Path('/Users/aradhyadixit_74/Desktop/VeltoStudios/assets/voices/kokoro');FF='/Users/aradhyadixit_74/Desktop/VeltoStudios/.tools/bin/ffmpeg'
k=Kokoro(str(K/'kokoro-v1.0.fp32.onnx'),str(K/'voices-v1.0.bin'));tok=Tokenizer()
scenes=json.loads((R/'VOICEOVER/script_hi.json').read_text());allparts=[];captions=[];offset=0
for i,(text,target) in enumerate(scenes):
 pieces=[s.strip() for s in re.split(r'(?<=[।!?])\s+',text) if s.strip()];raws=[]
 for j,s in enumerate(pieces):
  ph=re.sub(r'\((?:en|hi|en-us|en-gb)\)','',tok.phonemize(s,lang='hi'));sig,sr=k.create(ph,voice='hm_omega',speed=1.04,is_phonemes=True);raws.append((s,sig,sr))
 total=sum(len(sig)/sr for _,sig,sr in raws);factor=total/(target-.08*len(raws));local=0
 for j,(s,sig,sr) in enumerate(raws):
  base=R/f'VOICEOVER/phrase_{i+1}_{j+1}';raw=base.with_suffix('.wav')
  with wave.open(str(raw),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(sig,-1,1)*32767).astype('<i2').tobytes())
  duration=(len(sig)/sr)/factor+.08;out=base.with_suffix('.aligned.wav');subprocess.run([FF,'-v','error','-y','-i',str(raw),'-af',f'atempo={factor},apad','-t',str(duration),'-ar','48000',str(out)],check=True)
  captions.append({'start':round(offset+local,3),'end':round(offset+local+duration-.06,3),'text':s,'scene':i+1});allparts.append(out);local+=duration
 offset+=target;print('scene',i+1,'tempo',round(factor,3),flush=True)
(R/'VOICEOVER/phrases_concat.txt').write_text(''.join("file '"+str(p)+"'\n" for p in allparts))
subprocess.run([FF,'-v','error','-y','-f','concat','-safe','0','-i',str(R/'VOICEOVER/phrases_concat.txt'),'-af','highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=9','-c:a','libmp3lame','-b:a','192k',str(R/'VOICEOVER/KanpurVerse_Part2_Hindi_Aligned.mp3')],check=True)
(R/'SUBTITLES/captions.json').write_text(json.dumps(captions,ensure_ascii=False,indent=2))
def ts(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
(R/'SUBTITLES/KanpurVerse_Part2_hi.srt').write_text('\n\n'.join(f'{i+1}\n{ts(c["start"])} --> {ts(c["end"])}\n{c["text"]}' for i,c in enumerate(captions))+'\n')
