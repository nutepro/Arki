import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('./dist/',import.meta.url);
const types={'index.html':'text/html; charset=utf-8','style.css':'text/css; charset=utf-8','app.js':'text/javascript; charset=utf-8','engine.js':'text/javascript; charset=utf-8','leaf.svg':'image/svg+xml','acorn.png':'image/png','acorn-wave.png':'image/png','opportunities.js':'text/javascript; charset=utf-8','videos.js':'text/javascript; charset=utf-8'};
for (const id of ['5269588','9314156','5834228','5229787','7487641','5834225','brainrot-1','brainrot-2','brainrot-3']) types[`media/${id}.mp4`]='video/mp4';
const port=Number(process.env.PORT||5173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535');
const server=http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!Object.hasOwn(types,name)){res.writeHead(404);res.end('Not found');return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  try{
    const content=await readFile(new URL(name,root));
    res.writeHead(200,{'Content-Type':types[name],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(500);res.end('Unable to read demo file');}
});
server.on('error',err=>{console.error(`Unable to start demo: ${err.message}`);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`Arki demo: http://localhost:${port}`));
