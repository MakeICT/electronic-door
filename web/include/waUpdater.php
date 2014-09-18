<?php

require_once('config.php');
require_once('Backend.php');
require_once('WildApricotAPIClient.php');


function updateStatuses(){
	$backend = Backend::instance();
	echo "Connecting...\n";
	$waApiClient = WaApiClient::getInstance();
	$waApiClient->initTokenByApiKey('eh130uhdivhxpkzhxlwz3fyueeow50');
	
	echo "Downloading contacts...\n";
	$waContacts = $waApiClient->get('contacts?$async=false');
	$waActives = array();
	foreach($waContacts as $contact){
		if(!empty($contact['Status']) && $contact['Status'] == 'Active'){
			$waActives[$contact['Email']] = $contact;
		}
	}

	$existingUsers = $backend->getUsers(null);
	$existingUsers = indexBy($existingUsers, 'email');
	echo "Activating users...\n";
	foreach($waActives as $waActiveEmail=>$waActiveContact){
		if(empty($existingUsers[$waActiveEmail])){
			echo "\tAdding user $waActiveEmail...\n";
			$backend->addUser(
				$waActiveEmail,
				$waActiveContact['FirstName'],
				$waActiveContact['LastName']
			);
			$backend->setUserActivationStatus($waActiveEmail, true);
		}elseif($existingUsers[$waActiveEmail]['status'] != 'active'){
			echo "\tUpdating user $waActiveEmail...\n";
			$backend->setUserActivationStatus($waActiveEmail, true);
		}
		unset($existingUsers[$waActiveEmail]);
	}

	echo "Deactivating users...\n";
	foreach($existingUsers as $userEmail=>$user){
		echo "\tDeactivating user $userEmail...\n";
		$backend->setUserActivationStatus($userEmail, false);
	}
}

if(count(debug_backtrace()) == 0){
	updateStatuses();
}
