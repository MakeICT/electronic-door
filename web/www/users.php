<?php
	/**
	 * MakeICT/Bluebird Arthouse Electronic Door Entry
	 *
	 * users.php - grant and revoke access
	 *
	 * Authors:
	 * 	Dominic Canare <dom@greenlightgo.org>
	 * 	Rye Kennedy <ryekennedy@gmail.com>
	 **/

	// @TODO: Require (admin) login
	 
	require_once('../include/config.php');
	require_once('../include/Backend.php');

	if(empty($_SESSION["userID"])){
		$_SESSION['redirectLocation'] = 'users.php';
		header("Location: login.php");
		exit();
	}
	
	$backend = Backend::instance();

	function enrollmentIsRunning(){
		$output = shell_exec('ps aux | grep enroll.py | grep -v grep');
		return !empty($output);
	}

	if(!empty($_REQUEST)){
		if($_REQUEST['action'] == 'dropUserTag'){
			try{
				$backend->dropUserTag($_REQUEST['email'], $_REQUEST['tag']);
				echo '0';
			}catch(Exception $exc){
				trigger_error($exc);
				echo $exc->getMessage();
			}
			
			exit();
		}elseif($_REQUEST['action'] == 'getTags'){
			$tags = $backend->getAllTags();
			echo json_encode($tags);
			exit();
		}elseif($_REQUEST['action'] == 'addUserTag'){
			try{
				$backend->addUserTag($_REQUEST['email'], $_REQUEST['tag']);
				echo '0';
			}catch(Exception $exc){
				trigger_error($exc);
				echo $exc->getMessage();
			}
			
			exit();
		}elseif($_REQUEST['action'] == 'Add User'){
			try{
				$backend->addUser($_REQUEST['email'], $_REQUEST['firstName'], $_REQUEST['lastName']);
				$_SESSION['messages'][] = "Added $_REQUEST[firstName] $_REQUEST[lastName]";
				
				header("Location: $_SERVER[PHP_SELF]");
				exit();
			}catch(Exception $exc){
				trigger_error($exc);
				$_SESSION['errors'][] = $exc->getMessage();
			}
		}elseif($_REQUEST['action'] == 'Enroll'){
			try{
				$user = $backend->getUserFromEmail($_REQUEST['email']);
				if(empty($user)){
					throw new Exception("Could not locate user with email '$email'");
				}

				$userID = $user['userID'];
				shell_exec("echo $user[firstName] $user[lastName] > /tmp/enrollmentStatus");
				shell_exec("/home/pi/code/makeictelectronicdoor/enroll.py $userID >> /tmp/enrollmentStatus &");

				header("Location: $_SERVER[PHP_SELF]");
				exit();
			}catch(Exception $exc){
				trigger_error($exc);
				$_SESSION['errors'][] = $exc->getMessage();
			}
		}elseif($_REQUEST['action'] == 'Cancel Enrollment'){
			if($waitingForSwipe){
				shell_exec("killall -9 nfc-read");
				
				$_SESSION['messages'][] = 'Enrollment Cancelled';
			}else{
				$_SESSION['errors'][] = 'Could not cancel enrollment - it\'s not running';
			}
			header("Location: $_SERVER[PHP_SELF]");
			exit();
		}elseif($_REQUEST['action'] == 'Unenroll'){
			try{
				$backend->unenrollUser($_REQUEST['email']);
				header("Location: $_SERVER[PHP_SELF]");
				exit();
			}catch(Exception $exc){
				trigger_error($exc);
				$_SESSION['errors'][] = $exc->getMessage();
			}
		}elseif($_REQUEST['action'] == 'Inactivate'){
			try{
				$backend->setUserActivationStatus($_REQUEST['email'], false);
				header("Location: $_SERVER[PHP_SELF]");
				exit();
			}catch(Exception $exc){
				trigger_error($exc);
				$_SESSION['errors'][] = $exc->getMessage();
			}
		}elseif($_REQUEST['action'] == 'Activate'){
			try{
				$backend->setUserActivationStatus($_REQUEST['email'], true);
				header("Location: $_SERVER[PHP_SELF]");
				exit();
			}catch(Exception $exc){
				trigger_error($exc);
				$_SESSION['errors'][] = $exc->getMessage();
			}
		}else{
			$_SESSION['errors'][] = "Unrecognized command: '$_REQUEST[action]'";
		}
	}

	require_once('../include/BasicTemplate.php');
	$template = new BasicTemplate(
		file_get_contents('template.html'),
		'User Administration',
		'style/users.css',
		'script/users.js'
	);
	$template->bufferStart();

	echo getFormattedErrors();
	echo getFormattedMessages();

	$waitingForSwipe = enrollmentIsRunning();
	if($waitingForSwipe){
		$swipeUser = shell_exec("head -n 1 /tmp/enrollmentStatus");
		echo "
				<div class='enrollmentStatus'>
					<h1>Enrolling $swipeUser</h1>
					<h2>Swipe card now!</h2>
					<form method='post'>
						<input type='submit' name='action' value='Cancel Enrollment' />
					</form>
				</div>";
	}
	
	?>
	
				<h1>Add a user</h1>
				<form method="post">
					<table>
						<thead>
							<tr>
								<th>First Name</th>
								<th>Last Name</th>
								<th>Email</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><input type="text" name="firstName" /></td>
								<td><input type="text" name="lastName" /></td>
								<td><input type="text" name="email" /></td>
							</tr>
							<tr>
								<th colspan="3"><input name='action' type="submit" value="Add User" /></th>
						</tbody>
					</table>
				</form>
				<hr/>
				<h1>Existing users</h1>

<?php

	$users = $backend->getUsers();
	echo "
				<table>
					<thead>
						<tr>
							<th>Tags</th>
							<th>Last Name</th>
							<th>First Name</th>
							<th>Email</th>
							<th>Status</th>
							<th colspan='3'>Actions</th>
						</tr>
					</thead>
					<tbody>";

	$count = 0;
	foreach($users as $user){
		$count++;
		$tags = $backend->getUserTags($user['email']);
		$allTags = $backend->getAllTags();
		
		$tagHTML = "<div class='tagContainer userTags' title='$user[email]'>";
		foreach($tags as $tag){
			$tagHTML .= "<div title='$tag' class='tag'><img src='images/tags/$tag.png' alt='$tag' width='20' height='20' /></div>";
			unset($allTags[array_search($tag, $allTags)]);
		}
		$tagHTML .= "</div>";
		$tagHTML .= "<div class='tagContainer unusedTagsBox' title='$user[email]'>";
		foreach($allTags as $tag){
			$tagHTML .= "<div title='$tag' class='tag'><img src='images/tags/$tag.png' alt='$tag' width='20' height='20' /></div>";
		}
		$tagHTML .= "</div>";
		
		if($waitingForSwipe){
			$enrollDisabled = "disabled='true' title='Enrollment in progress'";
		}else{
			$enrollDisabled = '';
		}

		$rowClass = ($count % 2 == 0) ? 'evenRow' : 'oddRow';

		$activateAction = ($user['status'] == 'active') ? 'Inactivate' : 'Activate';
		$enrollAction = ($user['isEnrolled']) ? 'Unenroll' : 'Enroll';
		
		echo "
						<tr class='$rowClass'>
							<td class='tagCell'>$tagHTML</td>
							<td>$user[lastName]</td>
							<td>$user[firstName]</td>
							<td>$user[email]</td>
							<td>$user[status]</td>
							<td>
								<form method='post'>
									<input type='hidden' name='email' value='$user[email]' />
									<input type='submit' name='action' value='$enrollAction' $enrollDisabled/>
								</form>
							</td>
							<td>
								<form method='post'>
									<input type='hidden' name='email' value='$user[email]' />
									<input type='submit' name='action' value='$activateAction' />
								</form>
							</td>
						</tr>";
	}
	echo "
					</tbody>
				</table>";
?>


<?php $template->bufferStop('PAGE_CONTENT'); ?>