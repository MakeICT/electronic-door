-- MakeICT/Bluebird Arthouse Electronic Door Entry
-- Dominic Canare <dom@greenlightgo.org>
-- Rye Kennedy <ryekennedy@gmail.com>

DROP DATABASE IF EXISTS MakeICTMemberKeys;
CREATE DATABASE IF NOT EXISTS MakeICTMemberKeys;
USE MakeICTMemberKeys;

CREATE TABLE IF NOT EXISTS persons (
	personID INT PRIMARY KEY AUTO_INCREMENT,
	firstName VARCHAR(64),
	lastName VARCHAR(64),
	email VARCHAR(255)
) ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS rfids (
	rfidID INT PRIMARY KEY AUTO_INCREMENT,
	id VARCHAR(255),
	personID INT DEFAULT NULL,
	FOREIGN KEY(personID) REFERENCES persons(personID)
) ENGINE=INNODB;

CREATE USER 'MakeICTDBUser'@'localhost' IDENTIFIED BY '2879fd3b0793d7972cbf7647bc1e62a4';
GRANT ALL PRIVILEGES ON MakeICTMemberKeys.* TO MakeICTDBUser;


