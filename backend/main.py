from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
import hashlib, json

ROOT=Path(__file__).parent
MEDIA=ROOT/'data'/'media'
MEDIA.mkdir(parents=True,exist_ok=True)
app=FastAPI(title='ULTRA API',version='0.1.0',description='Private media API for ULTRA')
app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173'],allow_methods=['*'],allow_headers=['*'])

@app.get('/api/v1/health')
def health():
    return {'status':'ok','service':'ultra-api','version':'0.1.0','utc':datetime.now(timezone.utc).isoformat()}

@app.post('/api/v1/media')
async def upload_media(file: UploadFile=File(...)):
    # Explicit upload only. Browser local storage does not call this endpoint.
    if not file.filename: raise HTTPException(400,'filename_required')
    media_id=str(uuid4()); suffix=Path(file.filename).suffix[:12]
    target=MEDIA/(media_id+suffix); digest=hashlib.sha256(); size=0
    try:
        with target.open('wb') as out:
            while chunk:=await file.read(1024*1024):
                size+=len(chunk)
                if size>2*1024*1024*1024: raise HTTPException(413,'file_too_large')
                digest.update(chunk); out.write(chunk)
    except Exception:
        target.unlink(missing_ok=True); raise
    meta={'id':media_id,'filename':file.filename,'bytes':size,'sha256':digest.hexdigest(),'created_at':datetime.now(timezone.utc).isoformat()}
    (MEDIA/(media_id+'.json')).write_text(json.dumps(meta))
    return meta

@app.get('/api/v1/media')
def list_media():
    return [json.loads(p.read_text()) for p in MEDIA.glob('*.json')]

@app.delete('/api/v1/media/{media_id}')
def delete_media(media_id:str):
    matches=list(MEDIA.glob(media_id+'.*'))
    if not matches: raise HTTPException(404,'media_not_found')
    for p in matches: p.unlink(missing_ok=True)
    return {'deleted':media_id}
