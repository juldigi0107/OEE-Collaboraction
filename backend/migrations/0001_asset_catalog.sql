CREATE TABLE IF NOT EXISTS asset_catalog(id TEXT PRIMARY KEY,parent TEXT NOT NULL,path TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS asset_parent ON asset_catalog(parent);
