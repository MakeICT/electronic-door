var backend = require('../../backend.js');

var fs = require('fs');
var tmp = require('tmp');

var child_process = require('child_process');

var readline = require('readline');
var google = require('googleapis');

function buildAuthClient(callback){
	backend.getPluginOptions(module.exports.name, function(settings){
		//var redirectURI = 'https://' + settings['Hostname'] + '/api/plugins/' + encodeURIComponent(module.exports.name) + '/handler';
		var redirectURI = 'https://security.makeict.org/api/plugins/' + encodeURIComponent(module.exports.name) + '/handler';
		//var oauth2Client = new google.auth.OAuth2(settings['Client ID'], settings['Client secret'], redirectURI);
		var clientID = '545192077100-hqt86p6t8hl1aedchgvb134h8kmlcc84.apps.googleusercontent.com';
		var clientSecret = 'ai5vuMf8IAXCf54btyiwepoj';
		var oauth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectURI);
		if(settings['token']){
			oauth2Client.setCredentials(JSON.parse(settings['token']));
		}
		callback(oauth2Client);
	});
}

module.exports = {
	name: 'Google Drive Backup',
	
	// @TODO: hide fields that should be hidden (like Token)
	// @TODO: add read-only field for displaying authorized account name
	options: [
		{
			'name': 'Folder ID',
			'type': 'text',
			'value': null,
		},{
			'name': 'Client ID',
			'type': 'hidden',
			'value': null,
		},{
			'name': 'Client secret',
			'type': 'hidden',
			'value': null,
		},{
			'name': 'Hostname',
			'type': 'hidden',
			'value': null,
		},{
			'name': 'token',
			'type': 'hidden',
			'value': null,
		}
	],

	onEnable: function(session){},
	
	// @TODO: add action to set/clear authorization token
	actions: [
		{
			'name': 'Authorize',
			'parameters': [
				{
					'name': 'Client ID',
					'type': 'text',
					'value': null,
				},{
					'name': 'Client secret',
					'type': 'password',
					'value': null,
				},{
					'name': 'Hostname', //@TODO: detect host name automatically?
					'type': 'text',
					'value': null,
				}
			],
			'execute': function(parameters, callback){
				backend.debug('Authorizing with Google');
				backend.setPluginOption(module.exports.name, 'Client ID', parameters['Client ID'], function(){
					backend.setPluginOption(module.exports.name, 'Client secret', parameters['Client secret'], function(){
						backend.setPluginOption(module.exports.name, 'Hostname', parameters['Hostname'], function(){
							buildAuthClient(function(oauth2Client){
								var url = oauth2Client.generateAuthUrl({
									access_type: 'offline',
									scope: 'https://www.googleapis.com/auth/drive',
								});
								if(callback) callback({'url' : url});
							});
						});
					});
				});
			},
		},{
			'name': 'De-authorize',
			'parameters': [],
			'execute': function(parameters, callback){
				backend.debug('De-authorizing Google Drive Backup plugin from Google API');
				backend.setPluginOption(module.exports.name, 'token', null);
				if(callback) callback();
			},
		},{
			'name': 'Backup Now',
			'parameters': [],
			'execute': function(parameters, callback){
				buildAuthClient(function(oauth2Client){				
					backend.getPluginOptions(module.exports.name, function(settings){
						if(!settings['token']){
							throw 'Not authorized with Google yet';
						}
						backend.log('Backup started');
					
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
									var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
									backend.debug('BACKUP: ' + tzoffset);
									var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0,-1);
									backend.debug('BACKUP: ' + localISOTime);
									var filename = localISOTime.replace(/T/, '_').replace(/:/g, '-').substring(0,19);
									backend.debug('BACKUP: ' + filename);

									backend.debug('Zipping...');
									//var zipProc = child_process.spawn('gzip', [tmpFilePath]);
									//zipProc.stdin.write(stdout);
									//zipProc.stdin.end();
									zipCMD = 'gzip ' + tmpFilePath
									var zipProc = child_process.execSync(zipCMD, [], function(error, stdout, stderr){
										if(error != null) {
											backend.error('Zip failed: ' + error);
											backend.error(stderr);
											return;
										} else {
											backend.debug('Zip succes');
											backend.log('Zip created');
										}

									});

									backend.debug('Zip process finished');
										
									backend.debug('SCP file: ' + tmpFilePath);

									var scpCMD = 'scp "' + tmpFilePath + '.gz" "security-backup@192.168.9.13:~/' + filename + '.sql.gz"';
									try{
										backend.debug('SCP Command: ' + scpCMD);
										child_process.exec(scpCMD, [], function(error, stdout, stderr){
											if(error !== null){
												backend.error('SCP failed: ' + error);
												backend.error(stderr);
												return;
											}else{
												backend.debug('SCP success');
												backend.log('Local (SCP) backup finished');
											}
										});
									}catch(exc){
										backend.log('SCP Backup Failed');
										backend.debug('SCP Error: ' + exc);
									}

									
									try{
										var drive = google.drive({ version: 'v2'});
									
										backend.debug('Uploading...');
										drive.files.insert({
											auth: oauth2Client,
											resource: {
												title: filename + '.sql.gz',
												mimeType: 'application/x-gzip',
													parents: [{
													'kind': 'drive#fileLink',
													'id': settings['Folder ID'],
													//'id': '0BzlftvWCkom_fjJyNzhDNjJjS1IxdmVfcW45RjU3ZWxhdEQzTmdtT1g3LVVkWEIta2hFWkU',
												}],
											}, media: {
												body: fs.createReadStream(tmpFilePath + '.gz'),
												mimeType: 'application/x-gzip',
											}
										}, function(error, response){
											if(error){
												backend.debug('Google drive error: ' + error);
												backend.error(error);
											}else{
												backend.log('Backup generated and uploaded! ' + filename + '.sql.gz');
												try{
													fs.unlink(tmpFilePath + '.gz');
												}catch(exc){}
												cleanupCallback();
											}
										});
									}catch(exc){
										backend.debug('Google drive error: ' + exc);
									}
								}
							});
						
						});
					});
				});
				if(callback) callback();
			},
		},
	],
	
	onInstall: function(){},
	onUninstall: function(){},
	onDisable: function(){},
	
	handleRequest: function(request, response){
		backend.debug('Received google authorization token');
		backend.getPluginOptions(module.exports.name, function(settings){
			buildAuthClient(function(oauth2Client){
				oauth2Client.getToken(request.params.code, function(err, tokens){
					if(err){
						backend.error('Google auth error');
						backend.error(err);
						return;
					}
					backend.setPluginOption(module.exports.name, 'token', tokens);
				});
			});
		});
		
		response.write('<html><script>window.close();</script><html>');
	}
};
