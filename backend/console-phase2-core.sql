CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY,name TEXT NOT NULL,path TEXT,department TEXT NOT NULL,kind TEXT NOT NULL,sha256 TEXT,bytes INTEGER);

CREATE TABLE IF NOT EXISTS sheets(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,name TEXT NOT NULL,department TEXT NOT NULL,rows INTEGER NOT NULL DEFAULT 0,cols INTEGER NOT NULL DEFAULT 0,meta TEXT NOT NULL DEFAULT '{}');

CREATE INDEX IF NOT EXISTS sheets_department ON sheets(department,source_id,name);

CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,page INTEGER NOT NULL,text TEXT NOT NULL DEFAULT '');

CREATE INDEX IF NOT EXISTS documents_source ON documents(source_id,page);

CREATE TABLE IF NOT EXISTS record_chunks(id TEXT PRIMARY KEY,sheet_id TEXT NOT NULL,department TEXT NOT NULL,chunk_no INTEGER NOT NULL,ordinal_start INTEGER NOT NULL,ordinal_end INTEGER NOT NULL,row_start INTEGER NOT NULL,row_end INTEGER NOT NULL,payload TEXT NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS record_chunks_sheet_chunk ON record_chunks(sheet_id,chunk_no);

CREATE INDEX IF NOT EXISTS record_chunks_sheet_rows ON record_chunks(sheet_id,row_start,row_end);

CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,sheet_id TEXT NOT NULL,department TEXT NOT NULL,row_num INTEGER NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,deleted INTEGER NOT NULL DEFAULT 0);

CREATE INDEX IF NOT EXISTS records_sheet ON records(sheet_id,row_num,deleted);

CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,module TEXT NOT NULL,department TEXT NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,deleted INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS entries_module ON entries(module,department,deleted);

CREATE TABLE IF NOT EXISTS source_files(source_id TEXT PRIMARY KEY,name TEXT NOT NULL,mime_type TEXT NOT NULL,bytes INTEGER NOT NULL,sha256 TEXT,chunks INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS source_file_chunks(source_id TEXT NOT NULL,chunk_no INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(source_id,chunk_no));

CREATE INDEX IF NOT EXISTS source_file_chunks_source ON source_file_chunks(source_id,chunk_no)