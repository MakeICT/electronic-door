<?php
	/**
	 * MakeICT/Bluebird Arthouse Electronic Door Entry
	 *
	 * logViewer.php View the logs
	 *
	 * Authors:
	 * 	Dominic Canare <dom@greenlightgo.org>
	 * 	Rye Kennedy <ryekennedy@gmail.com>
	 **/
	require_once('../include/config.php');
	require_once('../include/Backend.php');

	if(empty($_SESSION['userID'])){
		$_SESSION['redirectLocation'] = 'logViewer.php';
		header("Location: login.php");
		exit();
	}
	 
	include_once("../include/BasicTemplate.php");
	$template = new BasicTemplate(file_get_contents("template.html"));
	$template->bufferStart();
?>


Test page

<?php $template->bufferStop('PAGE_CONTENT'); ?>
