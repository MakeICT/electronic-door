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
				backend.log('Connecting to WildApricot...');
				api.connect(function(token){
					backend.log('Downloading contacts...');
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
									
									var updateGroups = function(){
										backend.getUserByEmail(user.email, function(user){
											backend.getGroups(function(groups){
												for(var i=0; i<groups.length; i++){
													var groupName = groups[i].name;
													if(groupName.indexOf("WA-Level: ") == 0){
														// @TODO: only call this if they're actually in this group?
														backend.setGroupEnrollment(user.userID, groupName, false);
													}
												}
											});
											if(level){
												var groupName = "WA-Level: " + level;
												var doEnrollment = function(){ backend.setGroupEnrollment(user.userID, groupName, true); };
												backend.addGroup(groupName, doEnrollment, doEnrollment);
											}
										});
									};
									
									if(user.userID){
										backend.updateUser(user, updateGroups);
									}else{
										backend.addProxyUser('WildApricot', this.data.Id, user, updateGroups, backend.debug);
									}
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
