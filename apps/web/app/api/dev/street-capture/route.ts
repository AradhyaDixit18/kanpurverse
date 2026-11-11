import { NextRequest } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
/** Local development capture sink; never available in production, no caller-controlled paths. */
export async function POST(req:NextRequest){
 if(process.env.NODE_ENV!=='development'||!['localhost','127.0.0.1'].includes(req.nextUrl.hostname)||req.headers.get('origin')!==req.nextUrl.origin)return new Response('Not available',{status:403});
 const bytes=await req.arrayBuffer(); if(bytes.byteLength>120_000_000)return new Response('Too large',{status:413});
 const kind=req.nextUrl.searchParams.get('kind');const folder=path.resolve(process.cwd(),'../../THIRD_INSTAGRAM_REEL/RAW_FOOTAGE');await mkdir(folder,{recursive:true});
 const file=`street-${Date.now()}.${kind==='png'?'png':kind==='json'?'json':'webm'}`;await writeFile(path.join(folder,file),Buffer.from(bytes));return Response.json({file});
}
