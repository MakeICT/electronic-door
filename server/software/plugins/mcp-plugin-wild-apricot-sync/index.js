var https = require('https');
var backend = require('../../backend.js');

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
	options: {
		'API key': 'password',
		'Account ID': 'text',
	},

	actions: {
		'Sync Now': function(){
			backend.log('Starting WildApricot sync...');
			backend.getPluginOptions(this.name, function(settings){
				backend.debug('Connecting to WildApricot...');
				api.connect(function(token){
					backend.debug('Downloading contacts...');
					api.get('contacts?$async=false', null, function(data){
						data = JSON.parse(data);
						if(!data || !data['Contacts'] || data['reason']){
							data = doThatThing();
						}
						var contacts = data['Contacts'];
						
						for(var i=0; i<contacts.length; i++){
							var contact = contacts[i];
							
							var transaction = {
								data: contact,
								callback: function(user){
									if(!user) user = {};
									user.firstName = this.data.FirstName;
									user.lastName = this.data.LastName;
									user.email = this.data.Email;
									user.status = (this.data.Status == 'Active') ? 'active' : 'inactive';

									for(var j=0; j<this.data.FieldValues.length; j++){
										this.data[this.data.FieldValues[j].FieldName] = this.data.FieldValues[j].Value;
									}
									user.joinDate = this.data['Member since'];
									user.joinDate = 0;
									
									var level = this.data['MembershipLevel']['Name'];
									var alreadyEnrolledInCorrectGroup = false;
									
									var updateGroups = function(){
										backend.getUserByEmail(user.email, function(user){
											var newGroupName = "WA-Level: " + level;
											backend.getUserGroups(user.userID, function(groups){
												for(var i=0; i<groups.length; i++){
													if(!groups[i].enrolled) continue;
													var groupName = groups[i].name;

													// remove user from all of the WA groups they are in if they are not the current group
													if(groupName.indexOf("WA-Level: ") == 0){
														if(groupName != newGroupName){
															backend.setGroupEnrollment(user.userID, groupName, false);
														}else{
															alreadyEnrolledInCorrectGroup = true;
														}
													}
												}
												if(level && !alreadyEnrolledInCorrectGroup){
													var doEnrollment = function(){ backend.setGroupEnrollment(user.userID, newGroupName, true); };
													backend.addGroup(newGroupName, doEnrollment, doEnrollment);
												}
											});
										});
									};
									
									if(!user.userID){
										backend.addProxyUser('WildApricot', this.data.Id, user, updateGroups, backend.debug);
									}
									backend.updateUser(user, updateGroups);
								},
							};
							backend.getUserByProxyID('WildApricot', contact.Id, transaction);
						}
					});
				});
			});
		},
	},
	
	onInstall: function(){
		backend.addProxySystem('WildApricot');
	},

	onUninstall: function(){},
	onEnable: function(){},
	onDisable: function(){}
};
