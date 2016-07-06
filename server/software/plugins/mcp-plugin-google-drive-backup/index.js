var backend = require('../../backend.js');

var fs = require('fs');
var tmp = require('tmp');

var child_process = require('child_process');

var readline = require('readline');
var google = require('googleapis');

function buildAuthClient(callback){
	backend.getPluginOptions(module.exports.name, function(settings){
		var redirectURI = 'https://' + settings['Hostname'] + '/api/plugins/' + encodeURIComponent(module.exports.name) + '/handler';
		var oauth2Client = new google.auth.OAuth2(settings['Client ID'], settings['Client secret'], redirectURI);
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

	onEnable: function(session){
		backend.getPluginOptions(module.exports.name, function(settings){
			if(!settings['token'] && session){
				module.exports.actions.Authorize(session);
			}
		});
	},
	
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
			'execute': function(parameters, session){
				backend.debug('Authorizing with Google');
				backend.setPluginOption(module.exports.name, 'Client ID', parameters['Client ID'], function(){
					backend.setPluginOption(module.exports.name, 'Client secret', parameters['Client secret'], function(){
						backend.setPluginOption(module.exports.name, 'Hostname', parameters['Hostname'], function(){
							buildAuthClient(function(oauth2Client){
								var url = oauth2Client.generateAuthUrl({
									access_type: 'offline',
									scope: 'https://www.googleapis.com/auth/drive',
								});
								if(session){
									try{
										session.response.send({'url' : url});
									}catch(exc){
										console.log(exc);
									}
								}
							});
						});
					});
				});
			},
		},{
			'name': 'De-authorize',
			'parameters': [],
			'execute': function(parameters, session){
				backend.debug('De-authorizing Google Drive Backup plugin from Google API');
				backend.setPluginOption(module.exports.name, 'token', null);
				if(session) session.response.send();
			},
		},{
			'name': 'Backup Now',
			'parameters': [],
			'execute': function(parameters, session){
				buildAuthClient(function(oauth2Client){				
					backend.getPluginOptions(module.exports.name, function(settings){
						if(!settings['token']){
							backend.error('Not authorized with Google yet');
							return;
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
									backend.debug('Zipping...');
									var zipProc = child_process.spawn('gzip', [tmpFilePath]);
									zipProc.stdin.write(stdout);
									zipProc.stdin.end();
									
									var drive = google.drive({ version: 'v2'});
									var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
									var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0,-1);
									var filename = localISOTime.replace(/T/, '_').replace(/:/g, '-').substring(0,19);
									
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
				
				if(session) session.response.send();
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
