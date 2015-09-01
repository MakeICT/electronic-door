<?php
/**
 * DatabaseClient.php
 * Author: Dominic Canare <dom@greenlightgo.org>
 * © 2007-2013
 *
 * This is an abstraction on PDO to force prepared statement usage.
 * Most method calls are chainable, where it makes sense.
 *
 **/
class DatabaseClient {
	private $db = null;
	private $lastResult = null;
	private $fetchMode = PDO::FETCH_ASSOC;

	/**
	 * Connect to a database
	 * @see http://www.php.net/manual/en/pdo.construct.php
	 **/
	public function __construct($type, $user, $password, $host='localhost', $database=null){
		try{
			$this->db = new PDO("$type:host=$host;dbname=$database", $user, $password, array(PDO::ATTR_PERSISTENT=>true));
			$this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
		}catch(PDOException $e){
			trigger_error($e);
			throw new Exception($e->getMessage());
		}
	}

	/**
	 * Convenience functino to perform queries as prepared statements.
	 * This will 100% prevent SQL injection attacks (if used properly).
	 * 
	 * Example 1 (positional parameters):
	 * 		$query = 'SELECT iq FROM nerds WHERE name = ?';
	 * 		$data = $dbc->safeQuery($query, 'dom')->fetch();
	 *
	 * Example 2 (named parameters):
	 * 		$query = 'UPDATE nerds SET iq=:iq WHERE name=:name';
	 * 		$args = array('iq'=>7, 'name'=>'dom');
	 * 		$data = $dbc->safeQuery($query, $args);
	 **/
	public function query($query, $args=null){
		try{
			$stmt = $this->db->prepare($query);
			if(!$stmt) throw new Exception("Bad SQL: $query");
			
			if(!is_array($args)){
				$args = func_get_args();
				array_shift($args);
			}
			foreach($args as $key=>$value){
				if(is_numeric($key)){
					$param = $key+1;
				}elseif(substr($key, 0, 1)!== ":"){
					$param = ":$key";
					if(!strstr($query, $param)){
						trigger_error("WARNING: '$param' is not a valid parameter in '$query'");
					}
				}
				
				if($value === ''){
					$stmt->bindValue($param, $value, PDO::PARAM_NULL);
				}else{
					$stmt->bindValue($param, $value);
				}
				
			}
			if(!$stmt->execute()){
				$info = $stmt->errorInfo();
				throw new Exception("$info[0]:$info[1]:$info[2]");
			}
				
			$this->lastResult = $stmt;
		}catch(Exception $exc){
			throw new Exception("Query failed: $query\nWith message : " . $exc->getMessage() . ".\nWith args : " . print_r($args, true));
		}

		return $this;
	}

	/**
	 * Retrieve the ID of the most recently inserted record.
	 * If ID $field is unspecified, uses table name (minus the last letter (hopefully an 's')) + 'ID'
	 **/
	public function getLastInsertID($table, $field=null){
		if($field===null) $field = substr($table, 0, -1)."ID";
		return $this->query("SELECT $field FROM $table ORDER BY $field DESC LIMIT 1")->fetchColumn();
	}

	/**
	 * Magic function to make chainable calls work
	 **/
	function __call($method, $args) {
		if(method_exists($this->db, $method)){
			$this->lastResult = call_user_func_array(array($this->db, $method), $args);
			return $this;
		}elseif(method_exists($this->lastResult, $method)){
			if($method==="fetchAll" || $method==="fetch"){
				if(!isset($args[0]) || $args[0] === null){
					$args[0] = $this->fetchMode;
				}
			}
			return call_user_func_array(array($this->lastResult, $method), $args);
		}else{
			throw new Exception("method '$method' does not exist");
		}
	}
}
