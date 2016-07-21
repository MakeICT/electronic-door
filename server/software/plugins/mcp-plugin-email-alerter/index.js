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
	options: [
		{
			'name': 'Protocol',
			'type': 'text',
			'value': 'smtps',
		},{	
			'name': 'Sender address',
			'type': 'text',
			'value': 'your-email-here@gmail.com',
		},{	
			'name': 'Password',
			'type': 'password',
			'value': '',
		},{	
			'name': 'Server',
			'type': 'text',
			'value': 'smtp.gmail.com',
		},{	
			'name': 'Subject',
			'type': 'text',
			'value': 'MCP Message',
		},{	
			'name': 'BCC',
			'type': 'text',
			'value': '',
		}
	],
	
	actions: [
		{
			'name': 'Send test message',
			'parameters': [],
			'execute': function(parameters, callback){
				sendMessage('Test message from MCP', 'Test body goes <i>here</i>.');
			},
		},{
			'name': 'Add subscription',
			'parameters': [{
				'name': 'Trigger',
				'type': 'text',
				'default': null,
			}],
			'execute': function(parameters, session, callback){
				backend.addPluginOption(module.exports.name, parameters['Trigger'], 'text', callback, callback);
			},
		},{
			'name': 'Delete subscription',
			'parameters': [{
				'name': 'Trigger',
				'type': 'text',
				'default': null,
			}],
			'execute': function(parameters, session, callback){
				for(var i=0; i<module.exports.options.length; i++){
					if(module.exports.options[i].name == parameters['Trigger']){
						throw 'That is not a trigger!';
					}
				}
				backend.removePluginOption(module.exports.name, parameters['Trigger'], callback, callback);
			}
		},
	],
	
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
				console.log('Email alerter composing message for ' + messageID);
				try{
					var message = '';
					if(Array.isArray(data) && data.length > 1){
						message = '<table><tr>';
						var keys = [];
						for(var c in data[0]){
							message += '<th>' + c + '</th>';
							keys.push(c);
						}
						message += '</tr>';
						for(var i=0; i<data.length; i++){
							message += '<tr>';
							for(var j=0; j<keys.length; j++){
								message += '<td>' + data[i][keys[j]] + '</td>';
							}
							message += '</tr>';
						}
						message += '</table>';
					}else{
						message = '<pre>' + JSON.stringify(data, null, "\t") + '</pre>';
					}
					
					sendMessage(
						messageID,
						message,
						subscriptions[messageID]
					);
				}catch(exc){
					console.error(module.exports.name + ': An error while composing a message');
					backend.debug(exc);
				}
			}
		});
	},
};
