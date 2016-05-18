var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

function getClientOptions(client){
	return backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
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

// @param client can be client object or clientID
function doUnlock(client, userID, nfc){
	try{
		// regroup the options by key/value pairs for easy lookup
		var clientOptions = getClientOptions(client);

		superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['UNLOCK'], fixUnlockDuration(clientOptions['Unlock duration']));
		backend.log(client.name, userID, nfc, 'unlock');
		broadcaster.broadcast(module.exports, 'door-unlocked', { 'client': client.clientID });
	}catch(exc){
		backend.error('Exception during unlock');
		backend.error(exc);
	}
}

module.exports = {
	name: 'Door Unlocker',
	options: {},
	actions: {
		'Unlock all': function(){
			// @TODO: implement "Unlock all" function
			broadcaster.broadcast(module.exports, "door-unlocked", { client: 'all', user: null });
		}, 'Lock all': function(){
			// @TODO: implement "Lock all" function
		}
		
	},
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
		actions: {
			'Unlock': function(client, callback){
				// @TODO get client from session
				doUnlock(client);
				if(callback) callback();
			},
			'Lock': function(client, callback){
				superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['LOCK']);
				
				if(callback) callback();
			},
		},
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
						if(plugin){
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
	
	onInstall: function(){
	},

	onUninstall: function(){
	},
	
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
					var options = backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
					
					var nfc = data['payload'].map(function(x) {
						var hex = x.toString(16);
						if(hex.length < 2) hex = '0' + hex;
						return hex;
					}).join('');
					
					var unlock = function(user){
						// @TODO add user to log
						doUnlock(client, user.userID, nfc);
					};
					var deny = function(user, reason){
						var userID = (user == null) ? null : user.userID;
						backend.log(client.name + ' - ' + reason, userID, nfc, 'deny');
						superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['DENY']);
					};
					backend.checkAuthorizationByNFC(nfc, options['Authorization tag'], unlock, deny);
				}
			}
		}
	},
};
