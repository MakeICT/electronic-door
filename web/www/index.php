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
	 
	include_once("../include/BasicTemplate.php");
	$template = new BasicTemplate(file_get_contents("template.html"));
	$template->bufferStart();

	echo getFormattedErrors();
	echo getFormattedMessages();
?>


Test page

<?php $template->bufferStop('PAGE_CONTENT'); ?>
