<?php
	/**
	 * MakeICT/Bluebird Arthouse Electronic Door Entry
	 *
	 * users.php - grant and revoke access
	 *
	 * Authors:
	 * 	Dominic Canare <dom@greenlightgo.org>
	 * 	Rye Kennedy <ryekennedy@gmail.com>
	 *  John Harrison <john.harrison@alum.mit.edu>
	 **/

	// @TODO: Require (admin) login
	 
	require_once('../include/config.php');
	require_once('../include/Backend.php');

	$backend = Backend::instance();

	if(!empty($_POST['login'])){
		$userID = $backend->authenticate($_POST['login'], $_POST['password']);
		if($userID){
			$_SESSION['userID'] = $userID;
			if(!empty($_SESSION['redirectLocation'])){
				header("Location: $_SESSION[redirectLocation]");
				unset($_SESSION['redirectLocation']);
			}else{
				header("Location: ./");
			}
			$_SESSION['messages'][] = 'Login successful!';
			exit();
		}else{
			$_SESSION['errors'][] = 'Bad login';
		}
	}elseif(!empty($_POST['logout'])){
		$_SESSION = array();
		$_SESSION['messages'] = 'You have been logged out';
	}
	if(!empty($_SESSION['redirectLocation'])){
		$_SESSION['messages'][] = "You must login to access <a title='$_SESSION[redirectLocation]'>that resource</a>.";
	}

	require_once('../include/BasicTemplate.php');
	$template = new BasicTemplate(file_get_contents('template.html'), 'Login Page');
	$template->bufferStart();

	echo getFormattedErrors();
	echo getFormattedMessages();
?>

				<form method="post">
					<table style="width: auto; margin: auto;">
						<tr>
							<th>Email</th>
							<td><input name="login" type="text"/></td>
						</tr><tr>
							<th>Password</th>
							<td><input name="password" type="password" /></td>
						</tr>
						<tr>
							<th colspan="2"><input type="submit" value="Login" /></th>
						</tr>
					</table>
				</form>
				
<?php $template->bufferStop('PAGE_CONTENT');
