var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

function pad(str){
	return (str + '                ').substring(0, 16);
}

function sendMessage(clientID, line1, line2){
	var msg = pad(line1) + pad(line2);
	backend.debug('Sending message: ' + msg);
	try{
		return superSerial.send(clientID, superSerial.SERIAL_COMMANDS['TEXT'], msg);
	}catch(exc){
		console.log(exc);
	}
}

module.exports = {
	name: 'LCD Client',
	options: {
		'Send line 1': 'text',
		'Send line 2': 'text',
	},
	actions: {
		'Send to all': function(){
			// @TODO: implement LCD Send all
		},
		'Clear all': function(){
			// @TODO: implement LCD Clear all
		}
	},
	clientDetails: {
		options: {
			'Send line 1': 'text',
			'Send line 2': 'text',
		},
		actions: {
			'Send text': function(client, callback){
				var options = backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');				
				sendMessage(client.clientID, options['Send line 1'], options['Send line 2']);
			},
			'Clear': function(client, callback){
				sendMessage(client.clientID, '', '');
				if(callback) callback();
			},
		},
		optionUpdated: function(client, option, newValue, oldValue, callback){
		},
	},
	
	onInstall: function(){
	},

	onUninstall: function(){
	},
	
	onEnable: function(){
		broadcaster.subscribe(module.exports);
	},
	
	onDisable: function(){
	},
	
	receiveMessage: function(source, messageID, data){
		if(messageID == 'serial-data-received'){
			if(data['to'] == 0){
				if(data['function'] == NFC){
				}
			}
		}
	},
};
