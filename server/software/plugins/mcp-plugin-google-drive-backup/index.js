var backend = require('../../backend.js');

var fs = require('fs');
var tmp = require('tmp');

var child_process = require('child_process');

var readline = require('readline');
var google = require('googleapis');

module.exports = {
	name: 'Google Drive Backup',
	
	// @TODO: hide fields that should be hidden (like Token)
	// @TODO: add read-only field for displaying authorized account name
	options: {
		'Client ID': 'text',
		'Client secret': 'password',
		'Folder ID': 'text',
		'Token': 'hidden',
	},

	onEnable: function(session){
		backend.getPluginOptions(module.exports.name, function(settings){
			if(!settings['Token']){
				module.exports.actions.Authorize(session);
			}
		});
	},
	
	// @TODO: add action to set/clear authorization token
	actions: {
		'Authorize': function(session){
			backend.debug('Authorizing with Google');
			
			backend.getPluginOptions(module.exports.name, function(settings){
				var redirectURI = 'https://localhost/plugins/' + encodeURIComponent(module.exports.name) + '/handler';
				var oauth2Client = new google.auth.OAuth2(settings['Client ID'], settings['Client secret'], redirectURI);
				
				var url = oauth2Client.generateAuthUrl({
					access_type: 'online',
					scope: 'https://www.googleapis.com/auth/drive',
				});
				
				if(session){
					session.response.send({'url' : url});
				}else{
					console.log('no session');
				}
			});
		},
		
		'Backup Now': function(){
			backend.getPluginOptions('Google Drive Backup', function(settings){
				backend.debug('Backing up...');
				var redirectURI = 'https://localhost/plugins/' + encodeURIComponent(module.exports.name) + '/handler';
				var oauth2Client = new google.auth.OAuth2(settings['Client ID'], settings['Client secret'], redirectURI);
				var token = oauth2Client.getToken(settings['Token'], function(err, tokens){
					if(err){
						backend.error('Google auth error');
						backend.error(err);
						return;
					}
					
					backend.debug('credentials received' + tokens);
					oauth2Client.setCredentials(tokens);
				
					tmp.file(function(err, tmpFilePath, fd, cleanupCallback){
						var options = {
							'env': { 
								'PGUSER': backend.connectionParameters.user,
								'PGPASSWORD': backend.connectionParameters.password,
							},
						};
						backend.debug('Generating backup...');
						child_process.exec('pg_dump -h localhost -f ' + tmpFilePath + ' ' + backend.connectionParameters.database, options, function(error, stdout, stderr){
							if(error !== null){
								backend.error('Google Drive Backup failed: ' + error);
								backend.error(stderr);
								return;
							}else{
								backend.debug('Zipping...');
								var zipProc = child_process.spawn('gzip', [tmpFilePath]);
								zipProc.stdin.write(stdout);
								zipProc.stdin.end();
								
								var drive = google.drive({ version: 'v2'});
								var filename = (new Date()).toISOString().replace(/T/, '_').replace(/:/g, '').substring(0,17);
								
								backend.debug('Uploading...');
								drive.files.insert({
									auth: oauth2Client,
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
										backend.error(error);
									}else{
										backend.log('Backup generated and uploaded! ' + filename + '.sql.gz');
										fs.unlink(tmpFilePath + '.gz');
										cleanupCallback();
									}
								});
							}
						});
					
					});
				});
			});
		},
	},
	
	onInstall: function(){},
	onUninstall: function(){},
	onDisable: function(){},
	
	handleRequest: function(request, response){
		backend.debug('Received google authorization token');
		backend.setPluginOption('Google Drive Backup', 'Token', request.params.code);
		response.write('<html><script>window.close();</script><html>');
	}
};
