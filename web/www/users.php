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
	 
	require_once('../include/config.php');
	require_once('../include/Backend.php');
	require_once('../include/BasicTemplate.php');

	function enrollmentIsRunning(){
		$output = shell_exec('ps -aux | grep enroll.py | grep -v grep');
		return !empty($output);
	}
	
	$template = new BasicTemplate(file_get_contents('template.html'));
	$template->bufferStart();

	$backend = Backend::instance();
	$waitingForSwipe = enrollmentIsRunning();

	if(!empty($_POST)){
		if($_POST['action'] == 'Add User'){
			try{
				$backend->addUser($_POST['email'], $_POST['firstName'], $_POST['lastName']);
				$_SESSION['messages'][] = "Added $_POST[firstName] $_POST[lastName]";
				
				header("Location: $_SERVER[PHP_SELF]");
				exit();
			}catch(Exception $exc){
				trigger_error($exc);
				$_SESSION['errors'][] = $exc->getMessage();
			}
		}elseif($_POST['action'] == 'Enroll'){
			try{
				$user = $backend->getUserFromEmail($_POST['email']);
				if(empty($user)){
					throw new Exception("Could not locate user with email '$email'");
				}

				$userID = $user['userID'];
				shell_exec("echo $user[firstName] $user[lastName] > /tmp/enrollmentStatus");
				shell_exec("enroll.py $userID >> /tmp/enrollmentStatus &");

				header("Location: $_SERVER[PHP_SELF]");
				exit();
			}catch(Exception $exc){
				trigger_error($exc);
				$_SESSION['errors'][] = $exc->getMessage();
			}
		}elseif($_POST['action'] == 'Cancel Enrollment'){
			if($waitingForSwipe){
				shell_exec("killall -9 nfc-read");
				
				$_SESSION['messages'][] = 'Enrollment Cancelled';
			}else{
				$_SESSION['errors'][] = 'Could not cancel enrollment - it\'s not running';
			}
			header("Location: $_SERVER[PHP_SELF]");
			exit();
		}
	}

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
								<td colspan="3"><input name='action' type="submit" value="Add User" /></td>
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
							<th>Last Name</th>
							<th>First Name</th>
							<th>Email</th>
							<th>Status</th>
							<th colspan='3'>&nbsp;</th>
						</tr>
					</thead>
					<tbody>";
	foreach($users as $user){
		if($waitingForSwipe){
			$enrollDisabled = "disabled='true' title='Enrollment in progress'";
		}else{
			$enrollDisabled = '';
		}
		echo "
						<tr>
							<td>$user[lastName]</td>
							<td>$user[firstName]</td>
							<td>$user[email]</td>
							<td>$user[status]</td>
							<td>
								<form method='post'>
									<input type='hidden' name='email' value='$user[email]' />
									<input type='submit' name='action' value='Enroll' $enrollDisabled/>
								</form>
							</td>
							<td>";
		if($user['status'] == 'active'){
			echo "
								<form method='post'>
									<input type='hidden' name='email' value='$user[email]' />
									<input type='submit' name='action' value='Revoke' />
								</form>";
		}
		echo "
							</td>
						</tr>";
	}
	echo "
					</tbody>
				</table>";
?>


<?php $template->bufferStop('PAGE_CONTENT'); ?>
