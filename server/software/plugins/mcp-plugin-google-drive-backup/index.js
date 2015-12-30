var backend = require('../../backend.js');

var fs = require('fs');
var tmp = require('tmp');

var child_process = require('child_process');

var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 */
function authorize(clientID, clientSecret, token, callback) {
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientID, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
	if(token){
		oauth2Client.credentials = JSON.parse(token);
		callback(oauth2Client);
	}else{
		return getNewToken(oauth2Client, callback);
	}
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: ['https://www.googleapis.com/auth/drive'],
	});
	
	// @TODO: make this redirect in the UI
	console.log('Authorize this app by visiting this url: ', authUrl);
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
	rl.question('Enter the code from that page here: ', function(code) {
		rl.close();
		oauth2Client.getToken(code, function(err, token) {
			if (err) {
				console.log('Error while trying to retrieve access token', err);
				return;
			}
			oauth2Client.credentials = token;
			backend.setPluginOption('Google Drive Backup', 'Token', token);
			callback(oauth2Client);
		});
	});
}

module.exports = {
	name: 'Google Drive Backup',
	
	// @TODO: hide fields that should be hidden (like Token)
	// @TODO: add read-only field for displaying authorized account name
	options: {
		'Client ID': 'text',
		'Client secret': 'text',
		'Redirect URI': 'text',
		'Folder ID': 'text',
		'Token': 'hidden',
	},

	// @TODO: add action to set/clear authorization token
	actions: {
		'Backup Now': function(){
			backend.getPluginOptions('Google Drive Backup', function(settings){
				settings = backend.regroup(settings, 'name', 'value');
			
				tmp.file(function(err, tmpFilePath, fd, cleanupCallback){
					var options = {
						'env': { 
							'PGUSER': backend.connectionParameters.user,
							'PGPASSWORD': backend.connectionParameters.password,
						},
					};
					child_process.exec('pg_dump -h localhost -f ' + tmpFilePath + ' ' + backend.connectionParameters.database, options, function(error, stdout, stderr){
						if(error !== null){
							console.error('Failed to run backup: ' + error);
							console.error(stderr);
							return;
						}else{
							var zipProc = child_process.spawn('gzip', [tmpFilePath]);
							zipProc.stdin.write(stdout);
							zipProc.stdin.end();
							
							authorize(
								settings['Client ID'],
								settings['Client secret'],
								settings['Token'],
								function(auth){
									var drive = google.drive({ version: 'v2'});
									var filename = (new Date()).toISOString().replace(/T/, '_').replace(/:/g, '').substring(0,17);
									
									drive.files.insert({
										auth: auth,
										resource: {
											title: filename + '.sql.gz',
											mimeType: 'application/x-gzip',
											parents: [{
												'kind': 'drive#fileLink',
												'id': settings['Folder ID'],
											}],
										}, media: {
											body: fs.createReadStream(tmpFilePath + '.gz'),
											mimeType: 'application/x-gzip',
										}
									}, function(error, response){
										if(error){
											console.log(error);
										}else{
											fs.unlink(tmpFilePath + '.gz');
											cleanupCallback();
										}
									});
								}
							);							
						}
					});
				});
			});
		},
	},
	
	onInstall: function(){
	},

	onUninstall: function(){
	},
	
	onEnable: function(){
	},
	
	onDisable: function(){
	}
	
};
