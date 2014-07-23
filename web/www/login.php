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
			trigger_error("Login good, redirecting to $_SESSION[redirectLocation]");
			header("Location: /$_SESSION[redirectLocation]");
			unset($_SESSION['redirectLocation']);
			exit();
		}{
			trigger_error("Bad Login");
			$error = "Bad login";
		}
	}

	require_once('../include/BasicTemplate.php');
	$template = new BasicTemplate(
		file_get_contents('template.html'),
		'Login Page'
	);
	
	$template->bufferStart();

	if(!empty($_POST)){
		echo $_POST['login'] . "<br/>" . $_POST['password'];
	}

	if(!empty($error)){
		echo $error;
	}
?>

<form method="post">
	<input name="login" type="text"/>
	<input name="password" type="password" />
	<input type="submit" value="Login" />
</form>

<?php $template->bufferStop('PAGE_CONTENT'); ?>
