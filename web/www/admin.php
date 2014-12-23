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
		$_SESSION['redirectLocation'] = 'admin.php';
		header("Location: login.php");
		exit();
	}
	 
	if(!empty($_REQUEST)){
		if($_REQUEST['action'] == 'Unlock'){
			if(!empty($_REQUEST['reason'])){
				$reason = addslashes($_REQUEST['reason']);
				exec("sudo /home/pi/code/makeictelectronicdoor/python/override.py \"$reason\" > /tmp/overrideStatus 2>&1 &");
				sleep(1);
				$_SESSION['messages'][] = 'Unlock message sent...<hr/><pre>' . implode('<br/>', file('/tmp/overrideStatus')) . '</pre>';
				header("Location: $_SERVER[PHP_SELF]");
				exit();
			}else{
				$_SESSION['errors'][] = 'You must specify a reason!';
			}
		}
	}

	include_once("../include/BasicTemplate.php");
	$template = new BasicTemplate(file_get_contents("template.html"));
	$template->bufferStart();

	echo getFormattedErrors();
	echo getFormattedMessages();

	$backend = Backend::instance();

	// @TODO: allow start/limit from GET parameters
	$logMessages = $backend->getLog();

	echo '<h2>Log</h2>
		<table>
			<tr>
				<th>Timestamp</th>
				<th>Type</th>
				<th>Message</th>
				<th>UserID</th>
				<th>Email</th>
				<th>First name</th>
				<th>Last name</th>
				<th>RFID</th>
			</tr>';
	foreach($logMessages as $log){
		echo "
			<tr>
				<td style='white-space:nowrap'>" . date('Y-m-d H:i:s T', $log[timestamp]) . "</td>
				<td>$log[logType]</td>
				<td>$log[message]</td>
				<td>$log[userID]</td>
				<td>$log[email]</td>
				<td>$log[firstName]</td>
				<td>$log[lastName]</td>
				<td>$log[rfid]</td>
			</tr>";
	}
	echo '
		</table>';
?>


<h2>Override door lock</h2>
<form method="POST">
	<h3>Reason:</h3>
	<textarea name="reason"></textarea>
	<br/>
	<input type="submit" name="action" value="Unlock" />
</form>

<?php $template->bufferStop('PAGE_CONTENT'); ?>
