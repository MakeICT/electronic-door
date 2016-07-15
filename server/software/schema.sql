-- MakeICT Electronic Door System
-- schema.sql: the database schema (PostgreSQL)
-- @author Dominic Canare <dom@makeict.org>

CREATE TYPE USER_STATUS AS ENUM('active', 'probation', 'inactive');
CREATE TYPE LOG_TYPE AS ENUM('assign', 'activate', 'de-activate', 'unlock', 'deny', 'message', 'error');

CREATE TYPE DATA_TYPE AS ENUM('number', 'text', 'boolean', 'hidden', 'password', 'tune');

CREATE TABLE IF NOT EXISTS users (
	"userID" SERIAL PRIMARY KEY,
	"firstName" VARCHAR(64) NOT NULL,
	"lastName" VARCHAR(64) NOT NULL,
	"email" VARCHAR(256) NULL UNIQUE,
	"passwordHash" VARCHAR(128) NULL,
	"joinDate" INT NULL,
	"birthdate" INT NULL,
	"nfcID" VARCHAR(256) UNIQUE,
	"status" USER_STATUS NOT NULL DEFAULT 'inactive'
);

CREATE TABLE IF NOT EXISTS groups (
	"groupID" SERIAL PRIMARY KEY,
	"name" VARCHAR(64) NOT NULL UNIQUE,
	"description" VARCHAR(1024)
);

CREATE TABLE IF NOT EXISTS "userGroups" (
	"groupID" INT NOT NULL,
	"userID" INT NOT NULL,
	FOREIGN KEY("groupID") REFERENCES "groups"("groupID") ON DELETE CASCADE,
	FOREIGN KEY("userID") REFERENCES users("userID"),
	PRIMARY KEY("groupID", "userID")
);

CREATE TABLE IF NOT EXISTS "proxySystems" (
	"systemID" SERIAL PRIMARY KEY,
	name VARCHAR(64) NOT NULL,
	UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS "proxyUsers" (
	"systemID" INT NOT NULL,
	"userID" INT NOT NULL,
	"proxyUserID" VARCHAR(128) NOT NULL,
	FOREIGN KEY("systemID") REFERENCES "proxySystems"("systemID"),
	FOREIGN KEY("userID") REFERENCES users("userID")
);

CREATE TABLE IF NOT EXISTS plugins (
	"pluginID" SERIAL PRIMARY KEY,
	"name" VARCHAR(128) NOT NULL,
	"enabled" BOOLEAN DEFAULT FALSE,
	UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "pluginOptions" (
	"pluginOptionID" SERIAL PRIMARY KEY,
	"pluginID" INT NOT NULL,
	"name" VARCHAR(128) NOT NULL,
	"type" DATA_TYPE NOT NULL DEFAULT 'text',
	"ordinal" INT NOT NULL,
	UNIQUE("pluginID", "name"),
	UNIQUE("pluginID", "ordinal"),
	FOREIGN KEY("pluginID") REFERENCES plugins("pluginID")
);

CREATE TABLE IF NOT EXISTS "pluginOptionValues" (
	"pluginOptionID" INT NOT NULL,
	"value" TEXT,
	FOREIGN KEY("pluginOptionID") REFERENCES "pluginOptions"("pluginOptionID") ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS logs (
	"logID" SERIAL PRIMARY KEY,
	"timestamp" INT NOT NULL,
	"logType" LOG_TYPE,
	"code" VARCHAR(256),
	"userID" INT NULL,
	"message" VARCHAR(1024) NULL,
	FOREIGN KEY("userID") REFERENCES users("userID")
);

CREATE TABLE IF NOT EXISTS clients (
	"clientID" INT NOT NULL PRIMARY KEY,
	"name" VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS "clientPluginAssociations" (
	"clientID" INT NOT NULL,
	"pluginID" INT NOT NULL,
	FOREIGN KEY("clientID") REFERENCES "clients"("clientID") ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY("pluginID") REFERENCES "plugins"("pluginID"),
	PRIMARY KEY("clientID", "pluginID")
);

CREATE TABLE IF NOT EXISTS "clientPluginOptions" (
	"clientPluginOptionID" SERIAL PRIMARY KEY,
	"pluginID" INT NOT NULL,
	"name" VARCHAR(128) NOT NULL,
	"type" DATA_TYPE NOT NULL DEFAULT 'text',
	"ordinal" INT NOT NULL,
	UNIQUE("pluginID", "name"),
	UNIQUE("pluginID", "ordinal"),
	FOREIGN KEY("pluginID") REFERENCES "plugins"("pluginID")
);

CREATE TABLE IF NOT EXISTS "clientPluginOptionValues" (
	"clientID" INT NOT NULL,
	"clientPluginOptionID" INT NOT NULL,
	"optionValue" VARCHAR(128) NOT NULL,
	FOREIGN KEY("clientID") REFERENCES clients("clientID") ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY("clientPluginOptionID") REFERENCES "clientPluginOptions"("clientPluginOptionID")
);

CREATE TABLE IF NOT EXISTS "authorizationTags" (
	"tagID" SERIAL PRIMARY KEY,
	"name" VARCHAR(128) NOT NULL,
	"sourcePluginID" INT NULL,
	"description" VARCHAR(1024),
	UNIQUE("name", "sourcePluginID"),
	FOREIGN KEY("sourcePluginID") REFERENCES "plugins"("pluginID")
);

CREATE TABLE IF NOT EXISTS "groupAuthorizationTags" (
	"groupID" INT NOT NULL,
	"tagID" INT NOT NULL,
	FOREIGN KEY("groupID") REFERENCES "groups"("groupID") ON DELETE CASCADE,
	FOREIGN KEY("tagID") REFERENCES "authorizationTags"("tagID") ON DELETE CASCADE,
	PRIMARY KEY("groupID", "tagID")
);

CREATE TABLE IF NOT EXISTS "scheduledJobs" (
	"jobID" SERIAL PRIMARY KEY,
	"description" VARCHAR(1024) NOT NULL,
	"cron" VARCHAR(64) NOT NULL,
	"action" VARCHAR(64) NOT NULL,
	"pluginID" INT DEFAULT NULL,
	"clientID" INT DEFAULT NULL,
	"enabled" BOOLEAN NOT NULL DEFAULT FALSE,
	FOREIGN KEY("pluginID") REFERENCES "plugins"("pluginID") ON DELETE CASCADE,
	FOREIGN KEY("clientID") REFERENCES "clients"("clientID") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "jobParameters" (
	"jobID" INT NOT NULL,
	"parameterName" VARCHAR(64) NOT NULL,
	"parameterValue" VARCHAR(64),
	FOREIGN KEY("jobID") REFERENCES "scheduledJobs"("jobID") ON DELETE CASCADE,
	PRIMARY KEY("jobID", "parameterName")
);

INSERT INTO "users" ("firstName", "lastName", "email", "status", "passwordHash", "joinDate") VALUES ('Temporary', 'Administrator', 'admin@makeict.org', 'active', '$2a$08$iV9ABq9Y9o87IKJVAWAa8OvWEU5KORp5b5SIgcfTvnCKlzK/5u28G', EXTRACT('epoch' FROM current_timestamp));
INSERT INTO "groups" ("name") VALUES ('administrators');
INSERT INTO "userGroups" ("userID", "groupID") ( SELECT "userID", "groupID"	FROM "users" JOIN "groups" ON 1=1);
INSERT INTO "authorizationTags" ("name") VALUES ('mcp-web-admin');
INSERT INTO "groupAuthorizationTags" ("groupID", "tagID") (SELECT "groupID", "tagID" FROM "authorizationTags" JOIN "groups" ON "authorizationTags".name = 'mcp-web-admin' AND groups.name = 'administrators');

INSERT INTO users ("firstName", "lastName", "email", "status", "joinDate") VALUES 
	('User 1', 'Test', 'test1@makeict.org', 'active', EXTRACT('epoch' FROM current_timestamp)),
	('User 2', 'Test', 'test2@makeict.org', 'active', EXTRACT('epoch' FROM current_timestamp));

INSERT INTO logs ("timestamp", "logType", "message") VALUES (EXTRACT('epoch' FROM current_timestamp), 'message', 'Database created');
INSERT INTO clients ("clientID", "name") VALUES (1, 'Test client 1');
INSERT INTO clients ("clientID", "name") VALUES (2, 'Test client 2');
