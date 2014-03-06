<?php

require_once("DatabaseClient.php");

class UserException extends Exception{}

function getFormattedMessages($type='messages', $class='message'){
	$before = "<div class='$class'>";
	$after = '</div>';
	$output = $before . implode("$after$before", $_SESSION[$type]) . $after;
	$_SESSION[$type] = [];
}

function getFormattedErrors(){
	return getFormattedMessages('errors', 'error');
}



session_start();
// @TODO: Move username/password to separate .ini file, add config.php to version control
$database = new DatabaseClient('mysql', 'MakeICTDBUser', '2879fd3b0793d7972cbf7647bc1e62a4', 'localhost', 'MakeICTMemberKeys');

if(empty($_SESSION['errors'])) $_SESSION['errors'] = [];
if(empty($_SESSION['messages'])) $_SESSION['messages'] = [];
