#!/usr/bin/env python3
"""Build a D1 Free-plan seed from the audited SQLite snapshot and original files.

Historical spreadsheet rows are packed into JSON chunks. Original files and embedded
OOXML media are split into small BLOB rows so every SQL statement stays below D1's
100 KB statement limit. No user account or secret is included.
"""
from __future__ import annotations
import hashlib, json, mimetypes, shutil, sqlite3, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'data'/'source.sqlite'
ORIGINALS=ROOT/'data'/'originals'
OUT=ROOT/'data'/'d1-free'
SQLDIR=OUT/'sql'
SQL_FILE_TARGET=3_000_000
RECORD_JSON_TARGET=36_000
FILE_CHUNK=45_056

MIME={
 'pdf':'application/pdf','png':'image/png','jpeg':'image/jpeg','jpg':'image/jpeg','gif':'image/gif','webp':'image/webp','svg':'image/svg+xml',
 'emf':'image/emf','wmf':'image/wmf','wdp':'image/vnd.ms-photo',
 'pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
 'xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'xlsm':'application/vnd.ms-excel.sheet.macroEnabled.12','xls':'application/vnd.ms-excel',
}
OFFICE_MEDIA_EXT={'.xlsx','.xlsm','.pptx'}

def q(v):
    if v is None:return 'NULL'
    if isinstance(v,(int,float)):return str(v)
    return "'"+str(v).replace("'","''")+"'"

def stmt(table, cols, vals):
    return f"INSERT INTO {table}({','.join(cols)}) VALUES({','.join(q(v) for v in vals)});\n"

class Writer:
    def __init__(self):
        if OUT.exists(): shutil.rmtree(OUT)
        SQLDIR.mkdir(parents=True)
        self.i=0;self.size=0;self.f=None;self.rows=0;self.files=[]
        self._next()
    def _next(self):
        if self.f:self.f.close()
        p=SQLDIR/f'{self.i:03d}.sql'; self.files.append(p); self.f=p.open('w',encoding='utf-8');self.size=0;self.i+=1
    def add(self,s):
        b=len(s.encode())
        if b>99_000: raise RuntimeError(f'SQL statement too long: {b} bytes')
        if self.size and self.size+b>SQL_FILE_TARGET:self._next()
        self.f.write(s);self.size+=b;self.rows+=1
    def close(self):
        if self.f:self.f.close()

con=sqlite3.connect(SRC)
con.row_factory=sqlite3.Row
w=Writer(); counts={}
for table, cols in [
 ('sources',['id','name','path','department','kind','sha256','bytes']),
 ('sheets',['id','source_id','name','department','rows','cols','meta']),
 ('documents',['id','source_id','page','text']),
 ('entries',['id','module','department','payload','version','deleted','created','updated']),
]:
    n=0
    for r in con.execute(f"SELECT {','.join(cols)} FROM {table}"):
        w.add(stmt(table,cols,[r[c] for c in cols]));n+=1
    counts[table]=n

def pack_sheet(sh):
    global chunk_count, base_record_count
    arr=[]; size=2; ord_start=1; ordinal=0; chunk_no=0; row_start=None; row_end=None
    def flush(arr,size,ord_start,ordinal,chunk_no,row_start,row_end):
        global chunk_count
        if not arr:return [],2,ordinal+1,chunk_no,None,None
        payload=json.dumps(arr,ensure_ascii=False,separators=(',',':'))
        cid=f"{sh['id']}#{chunk_no:05d}"
        w.add(stmt('record_chunks',['id','sheet_id','department','chunk_no','ordinal_start','ordinal_end','row_start','row_end','payload'],
                   [cid,sh['id'],sh['department'],chunk_no,ord_start,ordinal,row_start,row_end,payload]))
        chunk_count+=1
        return [],2,ordinal+1,chunk_no+1,None,None
    for r in con.execute('SELECT id,row_num,payload,version,deleted FROM records WHERE sheet_id=? ORDER BY row_num',(sh['id'],)):
        obj={'id':r['id'],'row_num':r['row_num'],'payload':json.loads(r['payload']),'version':r['version'] or 1,'deleted':r['deleted'] or 0}
        js=json.dumps(obj,ensure_ascii=False,separators=(',',':')); b=len(js.encode())
        if arr and size+1+b>RECORD_JSON_TARGET:
            arr,size,ord_start,chunk_no,row_start,row_end=flush(arr,size,ord_start,ordinal,chunk_no,row_start,row_end)
        if row_start is None:row_start=r['row_num']
        row_end=r['row_num'];arr.append(obj);size+=b+(1 if len(arr)>1 else 0);ordinal+=1;base_record_count+=1
    flush(arr,size,ord_start,ordinal,chunk_no,row_start,row_end)

chunk_count=0;base_record_count=0
for sh in con.execute('SELECT id,department FROM sheets ORDER BY id'):
    pack_sheet(sh)
counts['record_chunks']=chunk_count;counts['base_records']=base_record_count

file_count=file_chunks=file_bytes=0
asset_count=asset_chunks=asset_bytes=0
sources={r['id']:r for r in con.execute('SELECT * FROM sources')}

def mime_for(name):
    ext=Path(name).suffix.lower().lstrip('.')
    return MIME.get(ext) or mimetypes.guess_type(name)[0] or 'application/octet-stream'

def write_blob(file_id,name,raw):
    global file_count,file_chunks,file_bytes
    sha=hashlib.sha256(raw).hexdigest(); chunks=(len(raw)+FILE_CHUNK-1)//FILE_CHUNK
    w.add(stmt('source_files',['source_id','name','mime_type','bytes','sha256','chunks'],[file_id,name,mime_for(name),len(raw),sha,chunks]));file_count+=1;file_bytes+=len(raw)
    for i in range(chunks):
        part=raw[i*FILE_CHUNK:(i+1)*FILE_CHUNK]
        w.add(f"INSERT INTO source_file_chunks(source_id,chunk_no,data) VALUES({q(file_id)},{i},X'{part.hex()}');\n");file_chunks+=1
    return sha,chunks

def embedded_media(source_id,p):
    global asset_count,asset_chunks,asset_bytes,file_count,file_chunks,file_bytes
    if p.suffix.lower() not in OFFICE_MEDIA_EXT:return
    try:
        with zipfile.ZipFile(p) as z:
            members=[n for n in z.namelist() if '/media/' in n and not n.endswith('/')]
            for member in sorted(members):
                raw=z.read(member); occurrence=hashlib.sha256(f'{source_id}|{member}'.encode()).hexdigest()[:24];asset_id=f'asset:{occurrence}'
                before_chunks=file_chunks;before_bytes=file_bytes
                write_blob(asset_id,Path(member).name,raw)
                asset_chunks+=file_chunks-before_chunks;asset_bytes+=file_bytes-before_bytes;asset_count+=1
                w.add(stmt('asset_catalog',['id','parent','path'],[asset_id,source_id,member]))
    except zipfile.BadZipFile:
        return

for source_id in sorted(sources):
    folder=ORIGINALS/source_id
    if not folder.exists(): continue
    candidates=[p for p in folder.iterdir() if p.is_file()]
    if not candidates: continue
    p=candidates[0]; raw=p.read_bytes();write_blob(source_id,p.name,raw);embedded_media(source_id,p)
counts.update(source_files=file_count,source_file_chunks=file_chunks,source_file_bytes=file_bytes,embedded_assets=asset_count,embedded_asset_chunks=asset_chunks,embedded_asset_bytes=asset_bytes,total_seed_rows=w.rows)
w.close();con.close()
summary={'format':'OEE Collaboraction D1-only free-plan seed','counts':counts,'sql_files':len(w.files),'sql_bytes':sum(p.stat().st_size for p in w.files),'file_chunk_bytes':FILE_CHUNK,'record_json_target_bytes':RECORD_JSON_TARGET,'asset_policy':'Original Office files remain authoritative; embedded media are child preview assets linked through asset_catalog.'}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
