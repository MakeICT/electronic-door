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
	$before = "<div class='$class'>";
	$after = '</div>';
	$output = $before . implode("$after$before", $_SESSION[$type]) . $after;
	$_SESSION[$type] = array();
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
// @TODO: Move username/password to separate .ini file, add config.php to version control
$database = new DatabaseClient('mysql', 'MakeICTDBUser', '2879fd3b0793d7972cbf7647bc1e62a4', 'localhost', 'MakeICTMemberKeys');

if(empty($_SESSION['errors'])) $_SESSION['errors'] = array();
if(empty($_SESSION['messages'])) $_SESSION['messages'] = array();
