// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

var lcdResetTimers = {};

function getClientOptions(client){
	return backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
}

function center(text, lineLength){
	if(!lineLength) lineLength = 16;
	var spaces = (lineLength - text.length) / 2;
	return '                '.substring(0, spaces) + text;
}

function pad(str){
	return (str + '                ').substring(0, 16);
}

function sendMessage(clientID, line1, line2){
	var msg = pad(line1) + pad(line2);
	try{
		superSerial.send(clientID, superSerial.SERIAL_COMMANDS['TEXT'], msg);
	}catch(exc){
		console.log(exc);
	}
	if(lcdResetTimers[clientID]) clearTimeout(lcdResetTimers[clientID]);
	
	var client = backend.getClientByID(clientID);
	var clientOptions = getClientOptions(client);
	
	if(clientOptions['Idle message delay']){
		var sendIdleMessage = function(){
			module.exports.clientDetails.actions['Send text'](client);
		}
		lcdResetTimers[clientID] = setTimeout(sendIdleMessage, parseInt(clientOptions['Idle message delay']));
	}
}

function sendToAll(line1, line2){
	backend.debug("Send this to each client!");
	var clients = backend.getClients();
	for(var i=0; i<clients.length; i++){
		sendMessage(clients[i].clientID, line1, line2);
	}
}

module.exports = {
	name: 'LCD Client',
	options: [
		{
			'name': 'Send line 1',
			'type': 'text',
			'value': null,
		},{
			'name': 'Send line 2',
			'type': 'text',
			'value': null,
		},{
			'name': 'Idle message delay',
			'type': 'number',
			'value': null,
		},
	],
	actions: {
		'Send to all': function(){
			backend.getPluginOptions(module.exports.name, function(settings){
				sendToAll(settings['Send line 1'], settings['Send line 2']);
			});
		},
		'Clear all': function(){
			sendToAll('', '');
		},
		'Apply to all': function(client, callback){
			var clients = backend.getClients();
			backend.getPluginOptions(module.exports.name, function(settings){
				for(var i=0; i<clients.length; i++){
					for(var optionName in module.exports.options){
						backend.setClientPluginOption(clients[i].clientID, module.exports.name, optionName, settings[optionName]);
					}
				}
			});
		},
	},
	clientDetails: {
		options: [
			{
				'name': 'Send line 1',
				'type': 'text',
				'value': null,
			},{
				'name': 'Send line 2',
				'type': 'text',
				'value': null,
			},{
				'name': 'Idle message delay',
				'type': 'number',
				'value': null,
			},
		],
		actions: {
			'Send text': function(client, callback){
				var clientOptions = getClientOptions(client);
				sendMessage(client.clientID, clientOptions['Send line 1'], clientOptions['Send line 2']);
				if(callback) callback();
			},
			'Clear': function(client, callback){
				sendMessage(client.clientID, '', '');
				if(callback) callback();
			},
		},
		optionUpdated: function(client, option, newValue, oldValue, callback){
		},
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
		if(messageID == "alarm-triggered"){
			sendToAll('ALARM TRIGGERED', 'Deactivate w key');
		}else if(messageID == "fire-alarm-triggered"){
			sendToAll(' Fire! Exit now', ' then call 911!');
		}else if(messageID == "alarm-armed-away"){
			sendToAll('Alarm ACTIVATED', 'You may now exit');
		}else if(messageID == "alarm-armed-stay"){
			sendToAll('Alarm ACTIVATED', center('*stay mode*'));
		}else if(messageID == "alarm-disarmed"){
			sendToAll(' Alarm disarmed', center('Welcome!'));
		}
	},
};
