<?php

require_once('config.php');

class Backend {
	private function __construct($db){
		$this->db = $db;
	}

	public static function instance(){
		global $database;
		
		static $instance = null;
		if(!$instance) $instance = new Backend($database);
		
		return $instance;
	}

	/**
	 * @TODO: document this
	 **/
	public function getUsers(){
		$sql = 'SELECT * FROM users ORDER BY lastName, firstName';
		return $this->db->query($sql)->fetchAll();
	}

	/**
	 * @TODO: document this
	 * @return boolean - true on success, false on error
	 **/
	public function addUser($email, $firstName, $lastName){
		$this->db->beginTransaction();
		try{
			$sql = 'INSERT INTO users (firstName, lastName, email) VALUES (?, ?, ?)';
			$this->db->query($sql, $firstName, $lastName, $email);

			$userID = $this->getUserFromEmail($email)['userID'];

			$this->log('message', null, $userID, 'User created');
			$this->db->commit();
		}catch(Exception $exc){
			trigger_error($exc);
			$this->db->rollback();
		}
	}

	/**
	 * @TODO: document this
	 **/
	public function enrollUser($email, $nfcID){
		$this->db->beginTransaction();
		try{
			$userID = $this->getUserFromEmail($email)['userID'];
			
			$sql = '
				INSERT INTO rfids (id, userID) VALUES (:nfcID, :userID)
				ON DUPLICATE KEY UPDATE userID = :userID';
			$args = array('nfcID'=>$nfcID, 'userID'=>$userID);
			
			$this->db->query($sql, $args);
			$this->log('assign', $nfcID, $userID);

			$this->db->commit();
		}catch(Exception $exc){
			$this->rollback();
		}
	}

	public function log($logType, $rfid=null, $userID=null, $message=null){
		$sql = '
			INSERT INTO logs
				(timestamp, logType, rfid, userID, message)
			VALUES
				(UNIX_TIMESTAMP(), ?, ?, ?, ?)';

		$this->db->query($sql, $logType, $rfid, $userID, $message);
	}

	public function getUserFromEmail($email){
		return $this->db->query('SELECT * FROM users WHERE email = ?', $email)->fetch();
	}

	/**
	 * @TODO: document this
	 **/
	public function updateUserStatus($email, $newStatus){
	}
}
