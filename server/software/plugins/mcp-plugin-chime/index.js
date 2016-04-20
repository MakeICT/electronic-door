var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

function getClientOptions(client){
	return backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
}

module.exports = {
	name: 'Chime',
	options: {},
	actions: {
		'Chime all': function(){
		},
		
	},
	clientDetails: {
		options: {
			'Default tone sequence': 'text',
			'Default light sequence': 'text',
		},
		actions: {
			'Test sound': function(client, callback){
				var options = getClientOptions(client);
				var tone = superSerial.hexStringToByteArray(options['Default tone sequence']);
				if(tone.length == 0){
					tone = superSerial.hexStringToByteArray('3032343504040410');
				}
				console.log('Sending tone: ' + tone);
				superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['TONE'], tone);
				if(callback) callback();
			},
			'Test lights': function(client, callback){
				var options = getClientOptions(client);
				superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['LIGHTS'], superSerial.hexStringToByteArray(options['Default light sequence']));
			},
		},
		optionUpdated: function(client, option, newValue, oldValue, callback){},
	},
	
	onInstall: function(){},
	onUninstall: function(){},
	onEnable: function(){
		broadcaster.subscribe(module.exports);
	},
	
	onDisable: function(){
		broadcaster.unsubscribe(module.exports);
	},
	
	receiveMessage: function(source, messageID, data){
		if(messageID == 'door-unlocked'){
			var clients = backend.getClients();
			for(var i=0; i<clients.length; i++){
				module.exports.clientDetails.actions['Test sound'](clients[i]);
			}
		}else if(messageID == 'alarm-armed-away' || messageID == 'alarm-armed-stay'){
			var clients = backend.getClients();
			for(var i=0; i<clients.length; i++){
				tone = superSerial.hexStringToByteArray('35003500350404040410');
				superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['TONE'], tone);
			}
		}
	},
};
