var https = require('https');
var backend = require('../../backend.js');

var api = {
	apiKey: null,
	accountID: null,
	token: null,
	
	connect: function(next){
		backend.getPluginOptions('wildApricotSync', function(settings){
			settings = backend.regroup(settings, 'name', 'value');

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


	get: function(url, data, next){
		return this.send(url, 'GET', data, next);
	},

	put: function(url, data, next){
		return this.send(url, 'PUT', data, next);
	},

	post: function(url, data, next){
		return this.send(url, 'POST', data, next);
	}
};


module.exports = {
	name: 'wildApricotSync',
	options: {
		'API key': 'text',
		'Account ID': 'text',
	},

	actions: {
		'Sync Now': function(){
			console.log('Starting sync...');
			backend.getPluginOptions('wildApricotSync', function(settings){
				settings = backend.regroup(settings, 'name', 'value');
				
				api.connect(function(token){
					api.get('contacts?$async=false', null, function(data){
						var contacts = JSON.parse(data)['Contacts'];

						var contacts = JSON.parse(data)['Contacts'];
						for(var i=0; i<contacts.length; i++){
							var contact = contacts[i];
							
							var transaction = {
								newContact: contact,
								
								applyNewDetails: function(user){
									if(!user) user = {};
									
									user.firstName = this.newContact.FirstName;
									user.lastName = this.newContact.LastName;
									user.email = this.newContact.Email;
									user.status = (this.newContact.Status == 'Active') ? 'active' : 'inactive'
									for(var j=0; j<this.newContact.FieldValues; j++){
										if(this.newContact.FieldValues[j].FieldName == 'Member since'){
											user.joinDate = this.newContact.FieldValues[j].Value;
											break;
										}
									}
									
									return user;
								},
								
								addUser: function(){
									backend.addProxyUser('WildApricot', this.newContact.Id, this.applyNewDetails());
								},
								
								updateUser: function(user){
									backend.updateUser(this.applyNewDetails(user));
								},
							};
							backend.getUserByProxyID('WildApricot', contact.Id, transaction);
						}
						console.log("WildApricot sync done (probably (I dunno, it's async...))");
					});
				});
			});
		},
	},
	
	onInstall: function(){
		backend.addProxySystem('WildApricot');
		console.log('WildApricot plugin installed');
	},

	onUninstall: function(){
		
	},
	
	onEnable: function(){
	},
	
	onDisable: function(){
	}
	
};
