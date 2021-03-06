var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

function getClientOptions(client){
	try{
		return backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
	}catch(exc){
		backend.error('Failed to get client options in plugin ' + module.exports.name);
		backend.error(exc);
	}
}

function fixUnlockDuration(duration){
	if(duration === undefined || duration === null){
		duration = 3;
	}else{
		duration = parseInt(duration);
	}
	
	if(duration < 255){
		return [0, duration];
	}else if(duration > (1 << 16)){
		return (1<<16)-1;
	}else{
		return duration;
	}
}

module.exports = {
	name: 'Door Unlocker',
	options: {},
	actions: [
		{
			'name': 'Unlock all',
			'parameters': [{
				'name': 'Duration',
				'type': 'number',
				'value': 3
			}],
			'execute': function(parameters, callback){
				throw 'Not yet implemented';
				if(callback) callback();
				// @TODO: implement "Unlock all" function
//					broadcaster.broadcast(module.exports, "door-unlocked", { client: 'all', user: null });
			},
		},{
			'name': 'Lock all',
			'parameters': [],
			'execute': function(parameters, callback){
				throw 'Not yet implemented';
				if(callback) callback();
				// @TODO: implement "Lock all" function
			},
		}
	],
	clientDetails: {
		options: [
			{
				'name': 'Unlock duration',
				'type': 'number',
				'value': 3,
			},{
				'name': 'Authorization tag',
				'type': 'text',
				'value': null,
			},
		],
		actions: [
			{
				'name': 'Unlock',
				'parameters': [{
					'name': 'Duration',
					'type': 'number',
					'value': 3
				}],
				'execute': function(parameters, client, callback){
					// @TODO get client from session
					superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['UNLOCK'], fixUnlockDuration(parameters['Duration']));
					backend.log(client.name, null, null, 'unlock');
					broadcaster.broadcast(module.exports, 'door-unlocked', { 'client': client.clientID });

					if(callback) callback();
				},
			},{
				'name': 'Lock',
				'parameters': [],
				'execute': function(parameters, client, callback){
					superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['LOCK']);
					if(callback) callback();
				}
			},
		],
		optionUpdated: function(client, option, newValue, oldValue, callback){
			if(option == 'Authorization tag'){
				var findDuplicateTag = function(tag){
					var clientList = backend.getClients();
					var foundDuplicate = false;
					for(var i=0; i<clientList.length; i++){
						var searchClient = clientList[i];
						if(searchClient.clientID == client.clientID){
							continue;
						}
						
						var plugin = searchClient.plugins[module.exports.name];
						if(plugin && plugin.options){
							var allOptions = plugin.options;
							for(var j=0; j<allOptions.length; j++){
								if(allOptions[j].name == option){
									if(tag == allOptions[j].value){
										return true;
									}
									break;
								}
							}
						}
					}
					return false;
				};
				
				if(!findDuplicateTag(newValue)){
					if(oldValue && oldValue != ''){
						backend.debug('updating tag');
						backend.updateAuthorizationTag(oldValue, newValue, module.exports.name);
					}else{
						backend.debug('adding tag');
						backend.registerAuthorizationTag(newValue, '', module.exports.name);
					}
					return true;
				}else{
					return false;
				}
			}else if(option == 'Unlock duration'){
				// if they enter something negative, just set it to zero
				if(parseInt(newValue) < 0){
					backend.setClientPluginOption(client.clientID, module.exports.name, option, 0);
				}
			}
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
		if(messageID == 'serial-data-received'){
			if(data['to'] == 0){
				if(data['command'] == superSerial.SERIAL_COMMANDS['KEY']){
					backend.debug('Received NFC key');
					var client = backend.getClientByID(data['from']);
					var clientOptions = getClientOptions(client);
					
					var nfc = data['payload'].map(function(x) {
						var hex = x.toString(16);
						if(hex.length < 2) hex = '0' + hex;
						return hex;
					}).join('');
					
					var unlock = function(user){
						try{
							superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['UNLOCK'], fixUnlockDuration(clientOptions['Unlock duration']));
							backend.log(client.name, user.userID, nfc, 'unlock');
							var data = {
								'client': client.clientID,
								'user': user,
							};
							broadcaster.broadcast(module.exports, 'door-unlocked', data);
						}catch(exc){
							backend.error('Exception during unlock');
							backend.error(exc);
						}
					};
					var deny = function(user, reason){
						var userID = (user == null) ? null : user.userID;
						backend.log(client.name + ' - ' + reason, userID, nfc, 'deny');
						superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['DENY']);
					};
					backend.checkAuthorizationByNFC(nfc, clientOptions['Authorization tag'], unlock, deny);
				}else if(data['command'] == superSerial.SERIAL_COMMANDS['DOOR']){
					var client = backend.getClientByID(data['from']);
					if(data['payload'][0] == 0){
						backend.log(client.name + ': door opened');
					}else{
						backend.log(client.name + ': door closed');
					}
				}
			}
		}
	},
};
