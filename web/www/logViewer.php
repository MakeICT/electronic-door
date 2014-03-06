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
	 
	include_once("../include/BasicTemplate.php");
	$template = new BasicTemplate(file_get_contents("template.html"));
	$template->bufferStart();
?>


Test page

<?php $template->bufferStop('PAGE_CONTENT'); ?>
