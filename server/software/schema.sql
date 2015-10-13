-- MakeICT Electronic Door System
-- schema.sql: the database schema (PostgreSQL)
-- @author Dominic Canare <dom@makeict.org>

CREATE TYPE USER_STATUS AS ENUM('active', 'probation', 'inactive');
CREATE TYPE LOG_TYPE AS ENUM('assign', 'activate', 'de-activate', 'unlock', 'deny', 'message', 'error');

CREATE TABLE IF NOT EXISTS users (
	user_id SERIAL PRIMARY KEY,
	first_name VARCHAR(64) NOT NULL,
	last_name VARCHAR(64) NOT NULL,
	email VARCHAR(256) NULL,
	password_hash VARCHAR(128) NULL,
	member_since DATE NULL,
	status USER_STATUS NOT NULL DEFAULT 'inactive',
	UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS proxy_system (
	system_id SERIAL PRIMARY KEY,
	name VARCHAR(64) NOT NULL,
	UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS proxy_users (
	system_id INT NOT NULL,
	user_id INT NOT NULL,
	proxy_user_id VARCHAR(128) NOT NULL,
	FOREIGN KEY(system_id) REFERENCES proxy_system(system_id),
	FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS nfcs (
	nfc_id SERIAL PRIMARY KEY,
	id VARCHAR(256) UNIQUE,
	user_id INT DEFAULT NULL,
	FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS logs (
	log_id SERIAL PRIMARY KEY,
	timestamp INT NOT NULL,
	log_type LOG_TYPE,
	code VARCHAR(256),
	user_id INT NULL,
	message VARCHAR(1024) NULL,
	FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS tags (
	tag_id SERIAL PRIMARY KEY,
	tag VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS userTags (
	tag_id INT NOT NULL,
	user_id INT NOT NULL,
	PRIMARY KEY (tag_id, user_id),
	FOREIGN KEY(tag_id) REFERENCES tags(tag_id),
	FOREIGN KEY(user_id) REFERENCES users(user_id)
);

INSERT INTO users (first_name, last_name, email, status, password_hash) VALUES ('Temporary', 'Administrator', 'admin@makeict.org', 'active', '$6$2gxfvalXD6d5$QjJeuk3IRaiglzMWSEDlT1SNWOtuJLbwsVnaCKUNVlUXng/ptqNGXKO/.NZ71lImQQ3ec7hL.1.urB2pnceZ0.');
INSERT INTO proxy_system (name) VALUES ('WildApricot');
INSERT INTO logs (timestamp, log_type, message) VALUES (EXTRACT('epoch' FROM current_timestamp), 'message', 'Database created');
