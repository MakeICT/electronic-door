-- MakeICT Electronic Door System
-- schema.sql: the database schema (PostgreSQL)
-- @author Dominic Canare <dom@makeict.org>

CREATE TYPE USER_STATUS AS ENUM('active', 'probation', 'inactive');
CREATE TYPE LOG_TYPE AS ENUM('assign', 'activate', 'de-activate', 'unlock', 'deny', 'message', 'error');

CREATE TABLE IF NOT EXISTS nfcs (
	"nfcID" SERIAL PRIMARY KEY,
	"id" VARCHAR(256) UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
	"userID" SERIAL PRIMARY KEY,
	"isAdmin" BOOLEAN DEFAULT FALSE,
	"firstName" VARCHAR(64) NOT NULL,
	"lastName" VARCHAR(64) NOT NULL,
	"email" VARCHAR(256) NULL,
	"passwordHash" VARCHAR(128) NULL,
	"joinDate" INT NULL,
	"nfcID" INT NULL,
	"status" USER_STATUS NOT NULL DEFAULT 'inactive',
	UNIQUE("email"),
	FOREIGN KEY("nfcID") REFERENCES nfcs("nfcID")
);

CREATE TABLE IF NOT EXISTS proxy_system (
	"systemID" SERIAL PRIMARY KEY,
	name VARCHAR(64) NOT NULL,
	UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS proxy_users (
	"systemID" INT NOT NULL,
	"userID" INT NOT NULL,
	"proxyUserID" VARCHAR(128) NOT NULL,
	FOREIGN KEY("systemID") REFERENCES proxy_system("systemID"),
	FOREIGN KEY("userID") REFERENCES users("userID")
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

INSERT INTO users ("isAdmin", "firstName", "lastName", "email", "status", "passwordHash") VALUES (TRUE, 'Temporary', 'Administrator', 'admin@makeict.org', 'active', '$6$2gxfvalXD6d5$QjJeuk3IRaiglzMWSEDlT1SNWOtuJLbwsVnaCKUNVlUXng/ptqNGXKO/.NZ71lImQQ3ec7hL.1.urB2pnceZ0.');
INSERT INTO users ("firstName", "lastName", "email", "status") VALUES 
	('User 1', 'Test', 'test1@makeict.org', 'active'),
	('User 2', 'Test', 'test2@makeict.org', 'active');
INSERT INTO proxy_system ("name") VALUES ('WildApricot');
INSERT INTO logs ("timestamp", "logType", "message") VALUES (EXTRACT('epoch' FROM current_timestamp), 'message', 'Database created');
