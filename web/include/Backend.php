<?php
	/**
	 * MakeICT/Bluebird Arthouse Electronic Door Entry
	 *
	 * Backend.php - Data storage functions
	 *
	 * Authors:
	 * 	Dominic Canare <dom@greenlightgo.org>
	 * 	Rye Kennedy <ryekennedy@gmail.com>
	 **/

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
	public function getUsers($status='active'){
		$params = [];
		$sql = '
				SELECT
					users.*,
					(SELECT COUNT(0) FROM rfids WHERE rfids.userID = users.userID) > 0 AS isEnrolled
				FROM users';

		if(!empty($status)){
			$sql .= '
				WHERE status = :status';
			$params['status'] = $status;
		}

		$sql .= '
				ORDER BY lastName, firstName';

		
		return $this->db->query($sql, $params)->fetchAll();
	}

	/**
	 * Get's tags for a user
	 * @param	$email	the user's email address
	 * @return	an associative array of tags associated with this user, indexed by tagID
	 **/
	public function getUserTags($email){
		$sql = '
			SELECT tags.* FROM tags
				JOIN userTags ON tags.tagID = userTags.tagID
				JOIN users ON userTags.userID = users.userID
			WHERE users.email = ?';
		$tagRecords = $this->db->query($sql, $email)->fetchAll();

		$tags = array();
		foreach($tagRecords as $tagRecord){
			$tags[] = $tagRecord['tag'];
		}

		return $tags;
	}

	/**
	 * @TODO: document this
	 **/
	public function getAllTags(){
		$recordSet = $this->db->query('SELECT * FROM tags ORDER BY tag')->fetchAll();

		$tags = array();
		foreach($recordSet as $tagRecord){
			$tags[] = $tagRecord['tag'];
		}
		return $tags;
	}

	/**
	 * @TODO: document this
	 **/
	public function dropUserTag($email, $tag){
		// @TODO: don't allow user to remove admin tag from self (could create a no admin condition)
		$sql = '
			DELETE FROM userTags
			WHERE userID = (SELECT userID FROM users WHERE email = ?)
				AND tagID = (SELECT tagID FROM tags WHERE tag = ?)';
		$this->db->query($sql, $email, $tag);
		// @TODO: log this action
	}

	/**
	 * @TODO: document this
	 **/
	public function addUserTag($email, $tag){
		$sql = '
			INSERT INTO userTags (userID, tagID)
			VALUES (
				(SELECT userID FROM users WHERE email = ?),
				(SELECT tagID FROM tags WHERE tag = ?)
			)';
		$this->db->query($sql, $email, $tag);
		// @TODO: log this action
	}

	/**
	 * @TODO: document this
	 * @return boolean - true on success, false on error
	 **/
	public function addUser($email, $firstName, $lastName, $password=null){
		$this->db->beginTransaction();
		try{
			$sql = 'INSERT INTO users (firstName, lastName, email, passwordHash) VALUES (?, ?, ?, ?)';
			$this->db->query($sql, $firstName, $lastName, $email, crypt($password));

			$user = $this->getUserFromEmail($email);
			$userID = $user['userID'];

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
	public function updateUser($userID, $email, $firstName, $lastName, $password=null){
		$this->db->beginTransaction();
		try{
			$sql = '
				UPDATE users SET
					email=?, firstName=?, lastName=?, passwordHash=?
				WHERE userID = ?';
			$this->db->query($sql, $email, $firstName, $lastName, crypt($password), $userID);

			$this->log('message', null, $userID, 'User updated');
			$this->db->commit();
			
			return true;
		}catch(Exception $exc){
			$this->db->rollback();
			throw $exc;
		}

		return false;
	}

	/**
	 * @TODO: document this
	 **/
	public function enrollUser($email, $nfcID){
		$this->db->beginTransaction();
		try{
			$user = $this->getUserFromEmail($email);
			$userID = $user['userID'];
			
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

	/**
	 * @TODO: document this
	 **/
	public function unenrollUser($email){
		$this->db->beginTransaction();
		try{
			$user = $this->getUserFromEmail($email);
			$userID = $user['userID'];
			
			$sql = 'DELETE FROM rfids WHERE userID = ?';
			$this->db->query($sql, $userID);
			$this->log('unenroll', null, $userID);

			$this->db->commit();
		}catch(Exception $exc){
			$this->rollback();
		}
	}

	/**
	 * @TODO: document this
	 **/
	public function setUserActivationStatus($email, $active){
		$this->db->beginTransaction();
		if($active){
			$status = 'active';
		}else{
			$status = 'inactive';
		}
		try{
			$user = $this->getUserFromEmail($email);
			$userID = $user['userID'];
			
			$sql = 'UPDATE users SET status=? WHERE userID = ?';
			
			$this->db->query($sql, $status, $userID);
			$this->log("set activation: $status", null, $userID);

			$this->db->commit();
		}catch(Exception $exc){
			$this->rollback();
		}
	}

	/**
	 * @TODO: Document this
	 * @returns false if fail, userID if pass
	 **/
	public function authenticate($login, $attemptedPassword){
		$users = $this->getUsers();
		$users = indexBy($users, 'email');

		if(!empty($users[$login])){
			$realPassword = $users[$login]['passwordHash'];
			if($realPassword == crypt($attemptedPassword, $realPassword)){
				$tags = $this->getUserTags($login);
				if(in_array('admin', $tags)){
					return $users[$login]['userID'];
				}
			}
		}else{
			trigger_error("User not found");
		}

		return false;
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

	public function getLog($start=0, $count=100){
		// @TODO: Fix $start and $count for SQL injection
		$sql = "
			SELECT
				timestamp, logType, rfid, message,
				users.*
			FROM logs
				LEFT JOIN users ON logs.userID = users.userID
			ORDER BY timestamp DESC
			LIMIT $start, $count";
			
		return $this->db->query($sql)->fetchAll();
	}

	/**
	 * @TODO: document this
	 **/
	public function updateUserStatus($email, $newStatus){
	}
}
