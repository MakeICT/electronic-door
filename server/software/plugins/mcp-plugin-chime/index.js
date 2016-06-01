var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

function getClientOptions(client){
	return backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
}

function getClientActionParameter(action, parameterName){
	var action = module.exports.clientDetails.actions[action];
	for(var i=0; i<action.parameters.length; i++){
		if(action.parameters[i].name == parameterName){
			var parameter = action.parameters[i].name;
			if(parameter.value === null){
				return parameter.default;
			}else{
				return parameter.value;
			}
		}
	}
	backend.error('Unknown parameter (' + parameterName + ') for action (' + action + ')');
}

module.exports = {
	name: 'Chime',
	options: {},
	actions: [
		{
			'name': 'Chime all',
			'parameters': [
				{
					'name': 'Tune',
					'type': 'text',
					'value': '3032343537393b3c151515151515150c',
				},{
					'name': 'Lights',
					'type': 'text',
					'value': '35003500350031003500380020060106060606060106060b110b',
				}
			],
			'execute': function(parameters){
				throw 'Not yet implemented';
			},
		}
	],
	clientDetails: {
		options: [],
		actions: [
			{
				'name': 'Test sound',
				'parameters': [
					{
						'name': 'Tune',
						'type': 'text',
						'value': '3032343537393b3c151515151515150c',
					}
				],
				'execute': function(parameters, client, callback){
					superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['TONE'], parameters['tone']);
					if(callback) callback();
				},
			},{
				'name': 'Test lights',
				'parameters': [
					{
						'name': 'Lights',
						'type': 'text',
						'value': '35003500350031003500380020060106060606060106060b110b',
					}
				],
				'execute': function(parameters, client, callback){
					superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['LIGHTS'], parameters['lights']);
					if(callback) callback();
				},
			},
		],
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
		if(messageID == "door-unlocked"){
			var clients = backend.getClients();
			for(var i=0; i<clients.length; i++){
				var client = clients[i];
				if(client.plugins[module.exports.name]){
					module.exports.clientDetails.actions['Test sound'](client);
				}
			}
		}
	},
};
