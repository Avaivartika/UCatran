"""Incremental local SQLite FTS5 index. No network or arbitrary file access."""
import sqlite3, hashlib, re
from pathlib import Path

def extract(path):
    if path.stat().st_size > 30*1024*1024:
        raise ValueError('超过 30 MB，未建立索引')
    if path.suffix.lower() == '.pdf':
        from pypdf import PdfReader
        reader = PdfReader(path)
        for number, page in enumerate(reader.pages, 1):
            yield number, page.extract_text() or ''
    else:
        yield 0, path.read_text(encoding='utf-8-sig', errors='replace')

def search_library(root, home, query='', rebuild=False):
    root, home = Path(root).resolve(), Path(home)
    query = str(query).strip()
    if len(query) > 200: raise ValueError('检索词最多 200 字')
    db = sqlite3.connect(home/'library-index.sqlite')
    db.create_function('filename', 1, lambda value: Path(value).name, deterministic=True)
    warnings=[]; seen=set()
    try:
        db.execute('CREATE TABLE IF NOT EXISTS documents(path TEXT PRIMARY KEY, digest TEXT)')
        db.execute("CREATE VIRTUAL TABLE IF NOT EXISTS passages USING fts5(path UNINDEXED, page UNINDEXED, part UNINDEXED, body, tokenize='trigram')")
        if rebuild:
            db.execute('DELETE FROM documents'); db.execute('DELETE FROM passages')
        for path in root.rglob('*'):
            if not path.is_file() or path.suffix.lower() not in ('.pdf','.txt','.md','.csv'): continue
            resolved=path.resolve()
            if path.is_symlink() or not resolved.is_relative_to(root): continue
            key=str(resolved); seen.add(key)
            try:
                if path.stat().st_size > 30*1024*1024: raise ValueError('超过 30 MB')
                fingerprint=hashlib.sha256(path.read_bytes()).hexdigest()
                old=db.execute('SELECT digest FROM documents WHERE path=?',(key,)).fetchone()
                if old and old[0]==fingerprint: continue
                # Extract before replacing the old index; failure removes stale results.
                chunks=[]
                for page,text in extract(path):
                    for part,offset in enumerate(range(0,len(text),1600)):
                        chunks.append((key,page,part+1,text[offset:offset+1800]))
                db.execute('DELETE FROM passages WHERE path=?',(key,))
                db.executemany('INSERT INTO passages(path,page,part,body) VALUES(?,?,?,?)',chunks)
                db.execute('INSERT OR REPLACE INTO documents VALUES(?,?)',(key,fingerprint))
                if not chunks: warnings.append({'file':path.name,'error':'未提取到文本，扫描 PDF 需要 OCR'})
            except Exception:
                db.execute('DELETE FROM passages WHERE path=?',(key,));db.execute('DELETE FROM documents WHERE path=?',(key,))
                warnings.append({'file':path.name,'error':'无法索引：损坏、加密、不支持的内容或超过 30 MB'})
        for (key,) in db.execute('SELECT path FROM documents').fetchall():
            if key not in seen:
                db.execute('DELETE FROM documents WHERE path=?',(key,));db.execute('DELETE FROM passages WHERE path=?',(key,))
        db.commit()
        count=db.execute('SELECT count(*) FROM documents').fetchone()[0]
        terms=re.findall(r'[^\s]+',query.casefold())[:12]
        results=[]
        if terms:
            # LIKE is accelerated by the trigram index for >=3 characters and
            # still supports one/two-character Chinese terms without tokenizer loss.
            escaped=[t.replace('\\','\\\\').replace('%','\\%').replace('_','\\_') for t in terms]
            # Keep the body trigram lookup indexable, and union filename matches
            # so an agent can locate a document by the user's supplied name.
            where=' AND '.join("rowid IN (SELECT rowid FROM passages WHERE body LIKE ? ESCAPE '\\' UNION SELECT rowid FROM passages WHERE filename(path) LIKE ? ESCAPE '\\')" for _ in escaped)
            params=tuple('%'+term+'%' for term in escaped for _ in range(2))
            rows=db.execute('SELECT path,page,part,body FROM passages WHERE '+where+' LIMIT 100',params).fetchall()
            for key,page,part,body in rows:
                pos=min((body.casefold().find(t) for t in terms if t in body.casefold()),default=0)
                results.append({'path':key,'file':Path(key).name,'page':page,'part':part,'excerpt':body[max(0,pos-100):pos+500],'score':sum(body.casefold().count(t) for t in terms)})
            results.sort(key=lambda x:(-x['score'],x['file'],x['page'],x['part']))
        return {'results':results[:20],'documents':count,'warnings':warnings,'note':'本地全文检索；PDF 按页定位，无 OCR；每个文件最大 30 MB。多词以空格分隔，返回同时包含各词的片段。'}
    finally: db.close()
