var nodemailer = require('nodemailer');
var backend = require('../../backend.js');
var broadcaster = require('../../broadcast.js');

function sendMessage(subject, message, recipient){
	backend.getPluginOptions(module.exports.name, function(settings){
		var transporter = nodemailer.createTransport(
			settings['Protocol'] + '://' +
			settings['Sender address'] + ':' +
			settings['Password'] + '@' +
			settings['Server']
		);
		  
		// setup e-mail data with unicode symbols 
		var mailOptions = {
			from: settings['Sender address'],
			to: recipient,
			bcc: settings['BCC'],
			subject: settings['Subject'] + ': ' + subject,
			html: message,
		};
							 
		// send mail with defined transport object 
		try{
			transporter.sendMail(mailOptions, function(error, info){
				if(error){
					return backend.error(error.toString());
				}
			});
		}catch(exc){
			backend.error('Failed to send email: ' + exc);
		}
	});
}

module.exports = {
	name: 'Email Alerter',
	options: {
		'Protocol': 'text',
		'Sender address': 'text',
		'Password': 'password',
		'Server': 'text',
		'Subject': 'text',
		'BCC': 'text',
		'Add subscription': 'text',
		'Delete subscription': 'text',
	},
	
	actions: {
		'Send test message': function(callback){
			sendMessage('Test message from MCP', 'Test body goes <i>here</i>.');
		},
		'Add subscription': function(callback){
			backend.getPluginOptions(module.exports.name, function(settings){
				backend.addPluginOption(
					module.exports.name,
					settings['Add subscription'], 'text',
					function(){
						return backend.setPluginOption(module.exports.name, 'Add subscription', '', callback, callback);
					},
					callback
				);
			});
		},
		'Delete subscription': function(callback){
			backend.getPluginOptions(module.exports.name, function(settings){
				backend.removePluginOption(
					module.exports.name,
					settings['Delete subscription'],
					function(){
						return backend.setPluginOption(module.exports.name, 'Delete subscription', '', callback, callback);
					},
					callback
				);
			});
		},
	},
	
	onInstall: function(){},
	onUninstall: function(){},
	
	onEnable: function(){
		broadcaster.subscribe(module.exports);
	},
	
	onDisable: function(){},
	
	receiveMessage: function(source, messageID, data){
		backend.getPluginOptions(module.exports.name, function(settings){
			var subscriptions = {};
			for(var i in settings){
				if(!(module.exports.options[i])){
					subscriptions[i] = settings[i];
				}
			}
			
			if(subscriptions[messageID]){
				sendMessage(
					messageID,
					'<pre>' + JSON.stringify(data, null, "\t") + '</pre>',
					subscriptions[messageID]
				);
			}
		});
	},
};
