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
	public function getUsers(){
		$sql = 'SELECT * FROM users ORDER BY lastName, firstName';
		return $this->db->query($sql)->fetchAll();
	}

	/**
	 * Get's tags for a user
	 * @param	$email	the user's email address
	 * @return	an array of tags associated with this user
	 **/
	public function getUserTags($email){
		$sql = '
			SELECT tags.* FROM tags
				JOIN userTags ON tags.tagID = userTags.tagID
				JOIN users ON userTags.userID = users.userID
			WHERE users.email = ?';
		$tagRecords = $this->db->query($sql, $email)->fetchAll();
		$tags = [];
		foreach($tagRecords as $tagRecord){
			$tags[] = $tagRecord['tag'];
		}
		return $tags;
	}

	/**
	 * @TODO: document this
	 **/
	public function getAllTags(){
		return $this->db->query('SELECT * FROM tags ORDER BY tag')->fetchAll();
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

	/**
	 * @TODO: Document this
	 * @returns false if fail, userID if pass
	 **/
	public function authenticate($login, $password){
		$users = $this->getUsers();
		$users = indexBy($users, 'email');
		
		if(!empty($users[$login])){
			//trigger_error(print_r($users, true));
			// @TODO: hash the password before comparison (when hashes are stored) 
			if($users[$login]['passwordHash'] == $password){
				$tags = $this->getUserTags($login);
				print_r($tags);
				if(in_array('admin', $tags)){
					return $users[$login]['userID'];
				}
			}else{
				trigger_error("Bad password $password " . $users[$login]['passwordHash']);
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

	/**
	 * @TODO: document this
	 **/
	public function updateUserStatus($email, $newStatus){
	}
}
