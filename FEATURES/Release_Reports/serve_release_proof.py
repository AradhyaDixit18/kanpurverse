from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import os,json,base64
R=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
 def do_POST(self):
  if self.path!='/save-proof' or self.headers.get('Origin')!='http://localhost:8767':self.send_error(403);return
  n=int(self.headers.get('Content-Length','0'))
  if n>4000000:self.send_error(413);return
  data=json.loads(self.rfile.read(n));image=base64.b64decode(data['image'],validate=True)
  if not image.startswith(b'\xff\xd8'):self.send_error(400);return
  (R/'release-comment-proof.jpg').write_bytes(image);self.send_response(200);self.end_headers();self.wfile.write(b'Saved release-comment-proof.jpg')
os.chdir(R);ThreadingHTTPServer(('127.0.0.1',8767),Handler).serve_forever()
