<?php
	/**
	 * MakeICT/Bluebird Arthouse Electronic Door Entry
	 *
	 * config.php - configuration settings and convenience functions
	 *
	 * Authors:
	 * 	Dominic Canare <dom@greenlightgo.org>
	 * 	Rye Kennedy <ryekennedy@gmail.com>
	 **/

require_once("DatabaseClient.php");

class UserException extends Exception{}

function getFormattedMessages($type='messages', $class='message'){
	if(empty($_SESSION[$type])) return '';
	
	$before = "<div class='$class'>";
	$after = '</div>';
	$output = $before . implode("$after$before", $_SESSION[$type]) . $after;
	$_SESSION[$type] = array();

	return $output;
}

function getFormattedErrors(){
  return getFormattedMessages('errors', 'error');
}


function indexBy($arr, $field){
  $output = array();
  for($i=0; $i<count($arr); $i++){
		$output[$arr[$i][$field]] = $arr[$i];
	}
	return $output;
}


session_start();

$dbCredentials = split("\t", trim(file_get_contents('../include/DB_CREDENTIALS'))); // @TODO: fix this relative path...
$database = new DatabaseClient('mysql', $dbCredentials[0], $dbCredentials[1], 'localhost', 'MakeICTMemberKeys');

if(empty($_SESSION['errors'])) $_SESSION['errors'] = array();
if(empty($_SESSION['messages'])) $_SESSION['messages'] = array();
