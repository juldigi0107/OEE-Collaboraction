-- OEE COLLABORACTION - BMJ PACKAGING OFFSET
-- Initial D1 schema: core + realtime. Safe for fresh environments.
-- No user credential is seeded. First Superadmin must be created through the protected bootstrap flow.

CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('superadmin','admin','user')),department TEXT NOT NULL,permissions TEXT NOT NULL DEFAULT '[]',password_hash TEXT NOT NULL,salt TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires);
CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until_ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_attempts_until ON login_attempts(until_ts);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,user_id TEXT,action TEXT,entity_id TEXT,before_json TEXT,after_json TEXT,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,department TEXT NOT NULL DEFAULT 'PROJECT');
CREATE TABLE IF NOT EXISTS password_flags(user_id TEXT PRIMARY KEY,must_change INTEGER NOT NULL DEFAULT 1);
INSERT OR IGNORE INTO settings VALUES('brand','{"name":"OEE COLLABORACTION - BMJ PACKAGING OFFSET","tagline":"Intelligent Platform © 2026 IDJ","plant":"BMJ Packaging Offset"}','PROJECT');
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
CREATE INDEX IF NOT EXISTS entries_module_updated ON entries(module,deleted,updated DESC);
CREATE TABLE IF NOT EXISTS source_files(source_id TEXT PRIMARY KEY,name TEXT NOT NULL,mime_type TEXT NOT NULL,bytes INTEGER NOT NULL,sha256 TEXT,chunks INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS source_file_chunks(source_id TEXT NOT NULL,chunk_no INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(source_id,chunk_no));
CREATE INDEX IF NOT EXISTS source_file_chunks_source ON source_file_chunks(source_id,chunk_no);

CREATE TABLE IF NOT EXISTS machine_registry(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,department TEXT NOT NULL DEFAULT 'PROD',source_type TEXT NOT NULL DEFAULT 'edge',active INTEGER NOT NULL DEFAULT 1,heartbeat_at TEXT);
CREATE TABLE IF NOT EXISTS machine_state(machine_id TEXT PRIMARY KEY,state TEXT NOT NULL DEFAULT 'OFFLINE',pro TEXT,material TEXT,shift TEXT,group_name TEXT,counter REAL NOT NULL DEFAULT 0,speed REAL NOT NULL DEFAULT 0,alarm TEXT,since_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,source TEXT NOT NULL DEFAULT 'edge');
CREATE TABLE IF NOT EXISTS machine_events(id TEXT PRIMARY KEY,machine_id TEXT NOT NULL,event_type TEXT NOT NULL,event_ts TEXT NOT NULL,state TEXT,counter REAL,payload TEXT NOT NULL DEFAULT '{}');
CREATE INDEX IF NOT EXISTS machine_events_machine_ts ON machine_events(machine_id,event_ts DESC);
CREATE TABLE IF NOT EXISTS machine_minute_snapshot(machine_id TEXT NOT NULL,bucket_ts TEXT NOT NULL,counter REAL,speed REAL,state TEXT,pro TEXT,payload TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(machine_id,bucket_ts));
CREATE TABLE IF NOT EXISTS production_runs(id TEXT PRIMARY KEY,machine_id TEXT NOT NULL,pro TEXT NOT NULL,material TEXT,shift TEXT,group_name TEXT,operator_user_id TEXT,status TEXT NOT NULL DEFAULT 'RUNNING',planned_qty REAL,start_counter REAL NOT NULL DEFAULT 0,end_counter REAL,actual_qty REAL NOT NULL DEFAULT 0,good_qty REAL NOT NULL DEFAULT 0,reject_qty REAL NOT NULL DEFAULT 0,start_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,end_ts TEXT,source TEXT NOT NULL DEFAULT 'hmi',version INTEGER NOT NULL DEFAULT 1,unit TEXT);
CREATE INDEX IF NOT EXISTS production_runs_machine_status ON production_runs(machine_id,status,start_ts DESC);
CREATE INDEX IF NOT EXISTS production_runs_start ON production_runs(start_ts DESC);
CREATE TABLE IF NOT EXISTS downtime_events(id TEXT PRIMARY KEY,run_id TEXT,machine_id TEXT NOT NULL,class TEXT NOT NULL CHECK(class IN ('PDT','UPDT','COJ')),department TEXT,code TEXT,reason TEXT,root_cause TEXT,owner_department TEXT,start_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,end_ts TEXT,status TEXT NOT NULL DEFAULT 'OPEN',maintenance_call_id TEXT,created_by TEXT);
CREATE INDEX IF NOT EXISTS downtime_open ON downtime_events(status,start_ts);
CREATE INDEX IF NOT EXISTS downtime_class_start ON downtime_events(class,start_ts DESC);
CREATE TABLE IF NOT EXISTS maintenance_calls(id TEXT PRIMARY KEY,machine_id TEXT NOT NULL,run_id TEXT,downtime_id TEXT,priority TEXT NOT NULL DEFAULT 'NORMAL',requested_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,acknowledged_ts TEXT,closed_ts TEXT,requested_by TEXT,acknowledged_by TEXT,status TEXT NOT NULL DEFAULT 'OPEN',note TEXT);
CREATE INDEX IF NOT EXISTS maintenance_calls_status ON maintenance_calls(status,requested_ts);
CREATE INDEX IF NOT EXISTS maintenance_calls_requested ON maintenance_calls(requested_ts DESC);
CREATE TABLE IF NOT EXISTS quality_events(id TEXT PRIMARY KEY,run_id TEXT,machine_id TEXT NOT NULL,event_type TEXT NOT NULL DEFAULT 'NG',sample_qty REAL,good_qty REAL,reject_qty REAL,decision TEXT,note TEXT,created_by TEXT,created_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,unit TEXT);
CREATE INDEX IF NOT EXISTS quality_events_created ON quality_events(created_ts DESC);
CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,step TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',requested_by TEXT,decided_by TEXT,requested_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,decided_ts TEXT,note TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS approvals_entity_step ON approvals(entity_type,entity_id,step);
CREATE INDEX IF NOT EXISTS approvals_type_status_requested ON approvals(entity_type,status,requested_ts DESC);
CREATE TABLE IF NOT EXISTS integration_connections(id TEXT PRIMARY KEY,system TEXT NOT NULL,mode TEXT NOT NULL DEFAULT 'REST',base_url TEXT,secret_env TEXT,enabled INTEGER NOT NULL DEFAULT 0,poll_minutes INTEGER NOT NULL DEFAULT 5,last_sync TEXT,last_status TEXT,last_message TEXT,config TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS integration_sync_log(id TEXT PRIMARY KEY,connection_id TEXT NOT NULL,started_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,finished_ts TEXT,status TEXT,rows_in INTEGER NOT NULL DEFAULT 0,rows_out INTEGER NOT NULL DEFAULT 0,message TEXT);
CREATE INDEX IF NOT EXISTS integration_sync_connection ON integration_sync_log(connection_id,started_ts DESC);
INSERT OR IGNORE INTO integration_connections(id,system,mode,enabled,poll_minutes,config) VALUES
('machine-edge','MACHINE','EDGE_PUSH',0,1,'{"target":"machine_events"}'),
('odin','ODIN','REST',0,5,'{"target":"machine_events","items_path":"items","mapping":{}}'),
('sap','SAP','ODATA',0,5,'{"target":"planning","items_path":"value","mapping":{}}'),
('qlik','QLIK','PULL_FEED',0,5,'{"target":"analytics_feed"}');
