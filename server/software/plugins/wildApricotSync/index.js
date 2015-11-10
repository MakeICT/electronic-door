var https = require('https');
var api = {
	apiKey: null,
	accountID: null,
	token: null,
	
	connect: function(next){
		var backend = require('../../backend.js');
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
					console.log(keyJSON);
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
			var backend = require('../../backend.js');
			backend.getPluginOptions('wildApricotSync', function(settings){
				settings = backend.regroup(settings, 'name', 'value');
				
				api.connect(function(token){
					api.get('contacts?$async=false', null, function(data){
						console.log(data);
					});
				});
			});
		},
	},
	
	onInstall: function(){
		
	},

	onUninstall: function(){
		
	},
};
