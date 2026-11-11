"""HarfBuzz + fontTools outline shaping: correct Devanagari without platform RAQM."""
from pathlib import Path
from functools import lru_cache
import re
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
import aggdraw
from PIL import Image,ImageColor
F=Path(__file__).parent/'fonts'
class GlyphPen(BasePen):
 def __init__(self, glyphset, path, scale, ox, oy): super().__init__(glyphset);self.path=path;self.scale=scale;self.ox=ox;self.oy=oy
 def pt(self,p):return (p[0]*self.scale+self.ox,self.oy-p[1]*self.scale)
 def _moveTo(self,p):self.path.moveto(*self.pt(p))
 def _lineTo(self,p):self.path.lineto(*self.pt(p))
 def _curveToOne(self,p1,p2,p3):self.path.curveto(*self.pt(p1),*self.pt(p2),*self.pt(p3))
 def _qCurveToOne(self,p1,p2):
  p0=self._getCurrentPoint();c1=(p0[0]+2*(p1[0]-p0[0])/3,p0[1]+2*(p1[1]-p0[1])/3);c2=(p2[0]+2*(p1[0]-p2[0])/3,p2[1]+2*(p1[1]-p2[1])/3);self._curveToOne(c1,c2,p2)
 def _closePath(self):self.path.close()
 def _endPath(self):pass
@lru_cache(None)
def face(script,weight,size):
 path=F/f'Mukta-{script}-{weight}.ttf';data=path.read_bytes();hf=hb.Face(data);h=hb.Font(hf);h.scale=(size*64,size*64);hb.ot_font_set_funcs(h);tt=TTFont(path);return h,tt,hf,data
@lru_cache(4096)
def shape(s,size,weight='800'):
 runs=re.findall(r'[\u0900-\u097f\s]+|[^\u0900-\u097f\s]+|\s+',s);parts=[];advance=0
 for run in runs:
  script='devanagari' if re.search('[\u0900-\u097f]',run) else 'latin';h,tt,_,_=face(script,weight,size);b=hb.Buffer();b.add_str(run);b.guess_segment_properties();hb.shape(h,b)
  for info,pos in zip(b.glyph_infos,b.glyph_positions):
   glyphset=tt.getGlyphSet();glyph=glyphset[tt.getGlyphOrder()[info.codepoint]];p=aggdraw.Path();scale=size/tt['head'].unitsPerEm
   pen=GlyphPen(glyphset,p,scale,advance+pos.x_offset/64,size+4-pos.y_offset/64);glyph.draw(pen);parts.append(p)
   advance+=pos.x_advance/64
 out=Image.new('L',(max(1,int(advance)+8),int(size*1.7)),0)
 ctx=aggdraw.Draw(out)
 for path in parts:ctx.path(path,aggdraw.Brush(255))
 ctx.flush()
 return out,advance
def width(s,size,weight='800'):return shape(s,size,weight)[1]
def draw(d,s,y,size=64,color='#fff',x=64,center=False,weight='800'):
 mask,advance=shape(s,size,weight)
 if center:x=(1080-advance)/2
 # ImageDraw owns the live image; bitmap respects complex glyph placement already resolved above.
 d.bitmap((int(x),int(y)),mask,fill=color)
