-- MakeICT/Bluebird Arthouse Electronic Door Entry
-- 
-- schema.sql: the database schema
-- 
-- Dominic Canare <dom@greenlightgo.org>
-- Rye Kennedy <ryekennedy@gmail.com>

DROP DATABASE IF EXISTS MakeICTMemberKeys;
CREATE DATABASE IF NOT EXISTS MakeICTMemberKeys;
USE MakeICTMemberKeys;

CREATE TABLE IF NOT EXISTS users (
	userID INT PRIMARY KEY AUTO_INCREMENT,
	firstName VARCHAR(64) NOT NULL,
	lastName VARCHAR(64) NOT NULL,
	email VARCHAR(256) NULL,
	passwordHash VARCHAR(128) NULL,
	status ENUM ('active', 'probation', 'inactive') NOT NULL DEFAULT 'inactive',
	UNIQUE(email)
) ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS rfids (
	rfidID INT PRIMARY KEY AUTO_INCREMENT,
	id VARCHAR(256) UNIQUE,
	userID INT DEFAULT NULL,
	FOREIGN KEY(userID) REFERENCES users(userID)
) ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS logs (
	logID INT PRIMARY KEY AUTO_INCREMENT,
	timestamp INT NOT NULL,
	logType ENUM ('assign', 'activate', 'de-activate', 'unlock', 'deny', 'message', 'error'),
	rfid VARCHAR(256),
	userID INT NULL,
	message VARCHAR(1024) NULL,
	FOREIGN KEY(userID) REFERENCES users(userID)
) ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS tags (
	tagID INT PRIMARY KEY AUTO_INCREMENT,
	tag VARCHAR(32)
) ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS userTags (
	tagID INT NOT NULL,
	userID INT NOT NULL,
	PRIMARY KEY (tagID, userID),
	FOREIGN KEY(tagID) REFERENCES tags(tagID),
	FOREIGN KEY(userID) REFERENCES users(userID)
) ENGINE=INNODB;


GRANT USAGE ON *.* TO 'MakeICTDBUser'@'localhost'; DROP USER 'MakeICTDBUser'@'localhost';
CREATE USER 'MakeICTDBUser'@'localhost' IDENTIFIED BY '2879fd3b0793d7972cbf7647bc1e62a4';
GRANT ALL PRIVILEGES ON MakeICTMemberKeys.* TO MakeICTDBUser;

INSERT INTO tags (tag) VALUES
	('admin'),
	('makeict'),
	('bluebird');
	
INSERT INTO users (firstName, lastName, email, status, passwordHash) VALUES ('admin', 'admin', 'admin', 'active', '$6$2gxfvalXD6d5$QjJeuk3IRaiglzMWSEDlT1SNWOtuJLbwsVnaCKUNVlUXng/ptqNGXKO/.NZ71lImQQ3ec7hL.1.urB2pnceZ0.');
INSERT INTO userTags (userID, tagID) VALUES
	(
		(SELECT userID FROM users WHERE email = 'admin'),
		(SELECT tagID FROM tags WHERE tag = 'admin')
	),
	(
		(SELECT userID FROM users WHERE email = 'admin'),
		(SELECT tagID FROM tags WHERE tag = 'bluebird')
	),
	(
		(SELECT userID FROM users WHERE email = 'admin'),
		(SELECT tagID FROM tags WHERE tag = 'makeict')
	);
