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
			'path': '/v2/Accounts/' + this.accountID + '/' + url,
			'headers': { 
				'Authorization': 'Bearer ' + this.token,
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
		};
		if(data){
			data = JSON.stringify(data);
			options['headers']['Content-Length'] = data.length;
		}

		var responseBody = '';
		var req = https.request(options, function(response){			
			response.on('data', function(d){
				responseBody += d;
			});
	
			response.on('end', function(){
				if(next) next(responseBody);
			});
		});

		if(data){
			req.write(data);
		}
		req.end();
	},


	get: function(url, next){ return this.send(url, 'GET', null, next); },
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
					
						api.get('contacts?$async=false', function(data){
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
							
							for(var i=0; i<contacts.length; i++){
								try{
									var contact = contacts[i];
									var transaction = function(contact, user){
										module.exports.updateUser(contact, user, markOneDone);
									};
									var updateFunc = backend.getUserByProxyID.bind(this, 'WildApricot', contact.Id, transaction.bind(this, contact));
									setTimeout(updateFunc, i*parameters['Delay']);
								}catch(exc){
									backend.error('Contact sync error with ' + contacts[i]);
								}
							}
						});
					});
				});

				if(callback) callback();
			},
		},{
			'name': 'UpSync',
			'parameters': [{
				'name': 'Email',
				'type': 'email',
				'value': null,
			}],
			'execute': function(parameters, callback){
				var errorHandler = function(exc){
					backend.log('Failed to UpSync™ user ' + parameters['Email']);
					if(exc){
						backend.log(exc);
					}
				};

				try{
					backend.log('UpSync™ing user ' + parameters['Email'] + '...');
					backend.getUserByEmail(
						parameters['Email'],
						function(user){
							backend.getUserGroups(
								user.userID,
								function(groups){
									var localWAgroups = [];
									for(var i=0; i<groups.length; i++){
										var group = groups[i];
										if(group['enrolled']){
											var groupName = group['name'];
											if(groupName.indexOf('WA-Group: ') === 0){
												localWAgroups.push({'Label': groupName.substring(10)});
											}
										}
									}

									backend.getUserProxyID(
										user.userID, 'WildApricot',
										function(contactID){
											backend.getPluginOptions(this.name, function(settings){
												backend.debug('Connecting to WildApricot...');
												api.connect(function(token){
													backend.debug('API Connected!');
													var updateData = {
														"Id": contactID,
														"FieldValues": [{
															"FieldName": "Group participation",
															"Value": localWAgroups
														}]
													};

													api.put(
														'Contacts/' + contactID,
														updateData,
														function(response){
															if(response != ''){
																backend.log('UpSync™ complete for ' + user.email);
															}else{
																errorHandler();
															}
														},
														errorHandler
													);
												});
											});
										},
										errorHandler
									);
								},
								errorHandler
							);
						},
						errorHandler
					);
				}catch(exc){
					errorHandler(exc);
				}

				if(callback) callback();
			}
		},{
			'name': 'DownSync',
			'parameters': [{
				'name': 'Email',
				'type': 'email',
				'value': null,
			}],
			'execute': function(parameters, callback){
				var errorHandler = function(exc){
					backend.log('Failed to DownSync™ user ' + parameters['Email']);
					if(exc){
						backend.log(exc);
					}
				};

				try{
					backend.log('DownSync™ing user ' + parameters['Email'] + '...');
					backend.getUserByEmail(
						parameters['Email'],
						function(user){

							backend.getUserProxyID(
								user.userID, 'WildApricot',
								function(contactID){
									backend.getPluginOptions(this.name, function(settings){
										backend.debug('Connecting to WildApricot...');
										api.connect(function(token){
											backend.debug('API Connected!');
											api.get(
												'Contacts/' + contactID,
												function(response){
													var contact = JSON.parse(response);
													var logIt = function(){
														backend.log('DownSync™ complete for ' + user.email);
													};
													module.exports.updateUser(contact, user, logIt);
												}
											);
										});
									})
								},
								errorHandler
							);
						},
						errorHandler
					);
				}catch(exc){
					errorHandler(exc);
				}

				if(callback) callback();
			}
		}
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

	updateUser: function(contact, user, callback){
		if(!user) user = {};
		
		try{
			user.firstName = contact.FirstName;
			user.lastName = contact.LastName;
			user.email = contact.Email;
			user.status = (contact.Status == 'Active' && contact['MembershipLevel']['Name'] != 'Non-Member') ? 'active' : 'inactive';
			
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
							var waGroups = [];
							for(var k=0; k<contact["Group participation"].length; k++){
								waGroups.push("WA-Group: " + contact["Group participation"][k].Label)
							}
							var newGroupName = "WA-Level: " + level;
							backend.getUserGroups(userInDB.userID, function(groups){
								for(var i=0; i<groups.length; i++){
									if(!groups[i].enrolled) continue;
									var groupName = groups[i].name;
									// remove user from all of the WA level groups they are in if they are not the current group
									if(groupName.indexOf("WA-Level: ") == 0){
										if(groupName != newGroupName){
											backend.setGroupEnrollment(userInDB.userID, groupName, false);
										}else{
											alreadyEnrolledInCorrectGroup = true;
										}
									}
								}
								//add user to groups based on WA Member Groups they are currently a part of
								for(var i=0; i<waGroups.length; i++){
									var groupName = waGroups[i];

									backend.addGroup(groupName, 'WildApricot Member Group');
									backend.setGroupEnrollment(userInDB.userID, groupName, true)
								}
								//remove user from WA Member groups that they are not currently a part of 
								for(var i=0; i<groups.length; i++){
									if(groups[i].name.indexOf("WA-Group:") == 0){
										if(!groups[i].enrolled) continue;
										if(waGroups.indexOf(groups[i].name) == -1){
											backend.setGroupEnrollment(userInDB.userID, groups[i].name, false)
										}
									}
								}
								if(level && !alreadyEnrolledInCorrectGroup){
									var doEnrollment = function(){
										backend.setGroupEnrollment(userInDB.userID, newGroupName, true, callback);
									};
									backend.addGroup(newGroupName, 'WildApricot Membership Level', doEnrollment);
								}else{
									if(callback) callback();
								}
							});
						}
					});
				};
				
				var doUpdate = function(){
					backend.updateUser(user, updateGroups);
				};
				
				if(!user.userID){
					backend.addProxyUser('WildApricot', contact.Id, user, doUpdate, backend.debug);
				}else{
					doUpdate();
				};
				
			}else{
				if(callback) callback();
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
	}
};
