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

CREATE TABLE IF NOT EXISTS admins (
	userID INT PRIMARY KEY,
	FOREIGN KEY(userID) REFERENCES users(userID)
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

GRANT USAGE ON *.* TO 'MakeICTDBUser'@'localhost'; DROP USER 'MakeICTDBUser'@'localhost';
CREATE USER 'MakeICTDBUser'@'localhost' IDENTIFIED BY '2879fd3b0793d7972cbf7647bc1e62a4';
GRANT ALL PRIVILEGES ON MakeICTMemberKeys.* TO MakeICTDBUser;

INSERT INTO users (firstName, lastName, email, passwordHash) VALUES ('admin', 'admin', 'admin', 'admin');
INSERT INTO admins (userID) VALUES ((SELECT userID FROM users WHERE email='admin'));
