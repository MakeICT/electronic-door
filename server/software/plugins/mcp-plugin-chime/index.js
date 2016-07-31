var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');
var tunes = {
	'happy-birthday': '',
	'i-love-you': '',
	'alarm-armed': '25312531253125312531253125312531253125314040404040404040404040404040404040404040',
	'alarm-disarmed': '310031080208',
};

function getClientOptions(client){
	try{
		return backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
	}catch(exc){
		backend.error('Failed to get client options in plugin ' + module.exports.name);
		backend.error(exc);
	}
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
					'type': 'tune',
					'value': '35003500350031003500380020060106060606060106060b110b',
				},{
					'name': 'Lights',
					'type': 'text',
					'value': '0300ff0000000000020FFF',
				}
			],
			'execute': function(parameters){
				throw 'Not yet implemented';
			},
		}
	],
	clientDetails: {
		options: [
			{
				'name': 'Default tune',
				'type': 'tune',
				'value': '35003500350031003500380020060106060606060106060b110b',
			},{
				'name': 'Default lights',
				'type': 'text',
				'value': '0300ff0000000000020FFF',
			}
		],
		actions: [
			{
				'name': 'Test sound',
				'parameters': [{
					'name': 'Tune',
					'type': 'tune',
					'value': '35003500350031003500380020060106060606060106060b110b',
				}],
				'execute': function(parameters, client, callback){
					if(parameters['Tune'] != ''){
						var data = superSerial.hexStringToByteArray(parameters['Tune']);
						superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['TONE'], data);
					}
					if(callback) callback();
				},
			},{
				'name': 'Test lights',
				'parameters': [{
					'name': 'Lights',
					'type': 'text',
					'value': '0300ff0000000000020FFF',
				}],
				'execute': function(parameters, client, callback){
					if(parameters['Lights'] != ''){
						var data = superSerial.hexStringToByteArray(parameters['Lights']);
						superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['LIGHTS'], data);
					}
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
	
	getClientActionByName: function(name){
		for(var i=0; i<module.exports.clientDetails.actions.length; i++){
			var action = module.exports.clientDetails.actions[i];
			if(action.name == name) return action;
		}
	},
	
	receiveMessage: function(source, messageID, data){
		if(messageID == "door-unlocked"){
			var client = backend.getClientByID(data['client']);

			var clientOptions = getClientOptions(client);
			var parameters = {
				'Tune': clientOptions['Default tune'],
				'Lights': clientOptions['Default lights'],
			};
			
			if(data.user){
				var now = new Date();
				var birthdate = new Date(data.user.birthdate*1000);

				if(now.getMonth() == birthdate.getMonth() && now.getDate() == birthdate.getDate()){
					parameters['Tune'] = '313133313635003131333138360031313a38363533003c3c3a3638360c0c18181818180c0c18181818180c0c181818181818181818181818';
					backend.log('Happy birthday!', data.user.userID);
				}
			}
			
			if(parameters['Tune'] && parameters['Tune'] != ''){
				superSerial.broadcast(superSerial.SERIAL_COMMANDS['TONE'], superSerial.hexStringToByteArray(parameters['Tune']));
				broadcaster.broadcast(module.exports, 'tune', parameters['Tune']);
			}
			if(parameters['Lights'] && parameters['Lights'] != ''){
				superSerial.broadcast(superSerial.SERIAL_COMMANDS['LIGHTS'], superSerial.hexStringToByteArray(parameters['Lights']));
			}
		}else if(messageID == 'alarm-armed-stay' || messageID == 'alarm-armed-away'){
			superSerial.broadcast(superSerial.SERIAL_COMMANDS['TONE'], superSerial.hexStringToByteArray(tunes['alarm-armed']));
		}
	},
};
