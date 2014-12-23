<?php
	/**
	 * MakeICT/Bluebird Arthouse Electronic Door Entry
	 *
	 * index.php main page
	 *
	 * Authors:
	 * 	Dominic Canare <dom@greenlightgo.org>
	 * 	Rye Kennedy <ryekennedy@gmail.com>
	 **/
	 
	require_once('../include/config.php');
	require_once('../include/Backend.php');

	include_once("../include/BasicTemplate.php");
	$template = new BasicTemplate(file_get_contents("template.html"));
	$template->bufferStart();

	echo getFormattedErrors();
	echo getFormattedMessages();
?>


I don't really know what to do with this page. Use the links, brah.

<?php $template->bufferStop('PAGE_CONTENT'); ?>
