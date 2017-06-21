var https = require('https');
var backend = require('../../backend.js');
var broadcaster = require('../../broadcast.js');

var api = {
	apiKey: null,
	accountID: null,
	token: null,
	
	connect: function(next){
		backend.getPluginOptions('Wild Apricot Sync', function(settings){
			api.apiKey = settings['API key'];
			api.accountID = settings['Account ID'];

			var options = {
				'method': 'POST',
				'hostname': 'oauth.wildapricot.org',
				'path': '/auth/token',
				'headers': {
					'Authorization' : 'Basic ' + (new Buffer('APIKEY:' + api.apiKey)).toString('base64'),
					'Content-Type' : 'application/x-www-form-urlencoded',
				},
			};
			
			var keyJSON = '';
			var req = https.request(options, function(response){
				
				response.on('data', function(d){
					keyJSON += d;
				});
				
				response.on('end', function(){
					var tokenData = JSON.parse(keyJSON);
					api.token = tokenData.access_token;
					next(this.token);
				});
			});
			req.write('grant_type=client_credentials&scope=contacts%20finances%20events%20event_registrations%20account%20membership_levels');
			req.end();
		});
	},

	send: function(url, method, data, next){
		if (typeof method === 'undefined') { method = 'GET'; }

		var options = {
			'method': method,
			'hostname': 'api.wildapricot.org',
			'path': '/v2/accounts/' + this.accountID + '/' + url,
			'headers': { 
				'Authorization': 'Bearer ' + this.token,
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		};

		var responseBody = '';
		var req = https.request(options, function(response){			
			response.on('data', function(d){
				responseBody += d;
			});
	
			response.on('end', function(){
				if(next) next(responseBody);
			});
		});

		if(data) req.write(JSON.stringify(data));
		req.end();
	},


	get: function(url, data, next){ return this.send(url, 'GET', data, next); },
	put: function(url, data, next){ return this.send(url, 'PUT', data, next); },
	post: function(url, data, next){ return this.send(url, 'POST', data, next); }
};

module.exports = {
	name: 'Wild Apricot Sync',
	options: [
		{
			'name': 'API key',
			'type': 'password',
			'value': null,
		},{
			'name': 'Account ID',
			'type': 'text',
			'value': null,
		},
	],

	actions: [
		{
			'name': 'Sync Now',
			'parameters': [{
				'name': 'Delay',
				'type': 'number',
				'value': 500
			}],
			'execute': function(parameters, callback){
				backend.log('Starting WildApricot sync...');
				backend.getPluginOptions(this.name, function(settings){
					backend.debug('Connecting to WildApricot...');
					api.connect(function(token){
						backend.debug('Downloading contacts...');
						
						api.get('contacts?$async=false', null, function(data){
							data = JSON.parse(data);
							if(!data || !data['Contacts'] || data['reason']){
								backend.error('WildApricot failed to download contacts: '  + JSON.stringify(data));
								return;
							}
							var contacts = data['Contacts'];
							var contactsLeftToSync = contacts.length;
							backend.debug(contactsLeftToSync + ' contacts to sync');
							var markOneDone = function(){
								if(--contactsLeftToSync == 0){
									backend.log('WildApricot Sync complete!');
								}
							};
							
							var updateUser = function(contact, user){
								if(!user) user = {};
								
								try{
									user.firstName = contact.FirstName;
									user.lastName = contact.LastName;
									user.email = contact.Email;
									user.status = (contact.Status == 'Active') ? 'active' : 'inactive';
									
									for(var j=0; j<contact.FieldValues.length; j++){
										contact[contact.FieldValues[j].FieldName] = contact.FieldValues[j].Value;
									}
									if(contact['Suspended member'] == true){
										user.status = 'inactive';
									}							
									if(contact['Member since']){
										user.joinDate = Math.floor((new Date(contact['Member since'])).getTime() / 1000);
										
										if(contact['MembershipLevel']){
											var level = contact['MembershipLevel']['Name'];
										}else{
											var level = null;
										}
										var alreadyEnrolledInCorrectGroup = false;
										
										var updateGroups = function(){
											backend.getUserByEmail(user.email, function(userInDB){
												if(!userInDB || !userInDB.userID){
													backend.error('User creation must have failed? ' + user.email);
												}else{
													var newGroupName = "WA-Level: " + level;
													backend.getUserGroups(userInDB.userID, function(groups){
														for(var i=0; i<groups.length; i++){
															if(!groups[i].enrolled) continue;
															var groupName = groups[i].name;

															// remove user from all of the WA groups they are in if they are not the current group
															if(groupName.indexOf("WA-Level: ") == 0){
																if(groupName != newGroupName){
																	backend.setGroupEnrollment(userInDB.userID, groupName, false);
																}else{
																	alreadyEnrolledInCorrectGroup = true;
																}
															}
														}
														if(level && !alreadyEnrolledInCorrectGroup){
															var doEnrollment = function(){
																backend.setGroupEnrollment(userInDB.userID, newGroupName, true);
																markOneDone();
															};
															backend.addGroup(newGroupName, 'WildApricot Membership Level', doEnrollment, doEnrollment);
														}else{
															markOneDone();
														}
													});
												}
											});
										};
										
										var updateUser = function(){
											backend.updateUser(user, updateGroups);
										};
										
										if(!user.userID){
											backend.addProxyUser('WildApricot', contact.Id, user, updateUser, backend.debug);
										}else{
											updateUser();
										};
										
									}else{
										markOneDone();
									}
								}catch(exc){
									backend.error('WildApricot Sync failed while attempting to update user :(');
									console.error(exc);
									var errorData = {
										'user': user,
										'exception': exc,
									};
									broadcaster.broadcast(module.exports, 'sync-error', errorData);
								}
							};
							for(var i=0; i<contacts.length; i++){
								var contact = contacts[i];
								var transaction = updateUser.bind(this, contact);
								var updateFunc = backend.getUserByProxyID.bind(this, 'WildApricot', contact.Id, transaction);
								setTimeout(updateFunc, i*parameters['Delay']);
							}
						});
					});
				});

				if(callback) callback();
			},
		},
	],
	
	onInstall: function(){
		backend.addProxySystem('WildApricot');
	},

	onUninstall: function(){},
	onEnable: function(){
		broadcaster.subscribe(module.exports);
	},
	onDisable: function(){
		broadcaster.unsubscribe(module.exports);
	},
	
	receiveMessage: function(source, messageID, data){},
};
