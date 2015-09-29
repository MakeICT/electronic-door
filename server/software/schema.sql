-- MakeICT Electronic Door System
-- 
-- schema.sql: the database schema (PostgreSQL)
-- 
-- Dominic Canare <dom@makeict.org>

CREATE TYPE USER_STATUS AS ENUM('active', 'probation', 'inactive');
CREATE TYPE LOG_TYPE AS ENUM('assign', 'activate', 'de-activate', 'unlock', 'deny', 'message', 'error');

CREATE TABLE IF NOT EXISTS users (
	userID SERIAL PRIMARY KEY,
	firstName VARCHAR(64) NOT NULL,
	lastName VARCHAR(64) NOT NULL,
	email VARCHAR(256) NULL,
	passwordHash VARCHAR(128) NULL,
	memberSince DATE NULL,
	status USER_STATUS NOT NULL DEFAULT 'inactive',
	UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS nfcs (
	nfcID SERIAL PRIMARY KEY,
	id VARCHAR(256) UNIQUE,
	userID INT DEFAULT NULL,
	FOREIGN KEY(userID) REFERENCES users(userID)
);

CREATE TABLE IF NOT EXISTS logs (
	logID SERIAL PRIMARY KEY,
	timestamp INT NOT NULL,
	logType LOG_TYPE,
	code VARCHAR(256),
	userID INT NULL,
	message VARCHAR(1024) NULL,
	FOREIGN KEY(userID) REFERENCES users(userID)
);

CREATE TABLE IF NOT EXISTS tags (
	tagID SERIAL PRIMARY KEY,
	tag VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS userTags (
	tagID INT NOT NULL,
	userID INT NOT NULL,
	PRIMARY KEY (tagID, userID),
	FOREIGN KEY(tagID) REFERENCES tags(tagID),
	FOREIGN KEY(userID) REFERENCES users(userID)
);

INSERT INTO tags (tag) VALUES
	('admin'),
	('no-expire');
	
INSERT INTO users (firstName, lastName, email, status, passwordHash) VALUES ('admin', 'admin', 'admin', 'active', '$6$2gxfvalXD6d5$QjJeuk3IRaiglzMWSEDlT1SNWOtuJLbwsVnaCKUNVlUXng/ptqNGXKO/.NZ71lImQQ3ec7hL.1.urB2pnceZ0.');
INSERT INTO userTags (userID, tagID) VALUES (
	(SELECT userID FROM users WHERE email = 'admin'),
	(SELECT tagID FROM tags WHERE tag = 'admin')
);
