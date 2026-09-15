CREATE TABLE IF NOT EXISTS machine_registry(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,department TEXT NOT NULL DEFAULT 'PROD',source_type TEXT NOT NULL DEFAULT 'edge',active INTEGER NOT NULL DEFAULT 1,heartbeat_at TEXT);
CREATE TABLE IF NOT EXISTS machine_state(machine_id TEXT PRIMARY KEY,state TEXT NOT NULL DEFAULT 'OFFLINE',pro TEXT,material TEXT,shift TEXT,group_name TEXT,counter REAL NOT NULL DEFAULT 0,speed REAL NOT NULL DEFAULT 0,alarm TEXT,since_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,source TEXT NOT NULL DEFAULT 'edge');
CREATE TABLE IF NOT EXISTS machine_events(id TEXT PRIMARY KEY,machine_id TEXT NOT NULL,event_type TEXT NOT NULL,event_ts TEXT NOT NULL,state TEXT,counter REAL,payload TEXT NOT NULL DEFAULT '{}');
CREATE INDEX IF NOT EXISTS machine_events_machine_ts ON machine_events(machine_id,event_ts DESC);
CREATE TABLE IF NOT EXISTS machine_minute_snapshot(machine_id TEXT NOT NULL,bucket_ts TEXT NOT NULL,counter REAL,speed REAL,state TEXT,pro TEXT,payload TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(machine_id,bucket_ts));
CREATE TABLE IF NOT EXISTS production_runs(id TEXT PRIMARY KEY,machine_id TEXT NOT NULL,pro TEXT NOT NULL,material TEXT,shift TEXT,group_name TEXT,operator_user_id TEXT,status TEXT NOT NULL DEFAULT 'RUNNING',planned_qty REAL,start_counter REAL NOT NULL DEFAULT 0,end_counter REAL,actual_qty REAL NOT NULL DEFAULT 0,good_qty REAL NOT NULL DEFAULT 0,reject_qty REAL NOT NULL DEFAULT 0,nc_qty REAL,start_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,end_ts TEXT,source TEXT NOT NULL DEFAULT 'hmi',version INTEGER NOT NULL DEFAULT 1,unit TEXT,plan_id TEXT,counter_start_trusted INTEGER NOT NULL DEFAULT 0,work_date TEXT,quality_rule TEXT,governance_approved INTEGER NOT NULL DEFAULT 0,governance_updated_at TEXT);
CREATE INDEX IF NOT EXISTS production_runs_machine_status ON production_runs(machine_id,status,start_ts DESC);
CREATE INDEX IF NOT EXISTS production_runs_start ON production_runs(start_ts DESC);
CREATE INDEX IF NOT EXISTS production_runs_plan ON production_runs(plan_id);
CREATE TABLE IF NOT EXISTS downtime_events(id TEXT PRIMARY KEY,run_id TEXT,machine_id TEXT NOT NULL,class TEXT NOT NULL CHECK(class IN ('PDT','UPDT','COJ')),department TEXT,code TEXT,reason TEXT,root_cause TEXT,owner_department TEXT,start_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,end_ts TEXT,status TEXT NOT NULL DEFAULT 'OPEN',maintenance_call_id TEXT,created_by TEXT);
CREATE INDEX IF NOT EXISTS downtime_open ON downtime_events(status,start_ts);
CREATE INDEX IF NOT EXISTS downtime_class_start ON downtime_events(class,start_ts DESC);
CREATE TABLE IF NOT EXISTS maintenance_calls(id TEXT PRIMARY KEY,machine_id TEXT NOT NULL,run_id TEXT,downtime_id TEXT,priority TEXT NOT NULL DEFAULT 'NORMAL',requested_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,acknowledged_ts TEXT,closed_ts TEXT,requested_by TEXT,acknowledged_by TEXT,status TEXT NOT NULL DEFAULT 'OPEN',note TEXT,resolution_note TEXT);
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
