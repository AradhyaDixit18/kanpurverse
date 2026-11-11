from pathlib import Path
import numpy as np,wave
R=Path(__file__).resolve().parents[1];sr=48000;n=51*sr;mix=np.zeros(n);rng=np.random.default_rng(7)
def add(at,sig,gain):
 a=int(at*sr);mix[a:a+len(sig)]+=sig*gain
for at in [8.4,11,23.2,35.6,43.1]:
 t=np.arange(int(sr*.12))/sr;add(at,np.sin(2*np.pi*(900*t-1400*t*t))*np.exp(-t*35),.12)
for at in [14.6,15.1]:
 t=np.arange(int(sr*.13))/sr;add(at,rng.normal(size=len(t))*np.exp(-t*30),.035)
t=np.arange(int(sr*.12))/sr;add(18.1,np.sin(2*np.pi*260*t)*np.exp(-t*30),.08)
with wave.open(str(R/'PROJECT_FILES/render/sfx.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((mix*32767).astype('<i2').tobytes())
