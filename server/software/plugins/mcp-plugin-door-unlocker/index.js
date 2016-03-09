var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

var UNLOCK = 0x01;
var LOCK = 0x02;
var NFC = 0x03;
var DENY = 0x0C;

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
		options: {
			'Unlock duration': 'number',
			'Authorization tag': 'text',
		},
		actions: {
			'Unlock': function(client, callback){
				try{
					// regroup the options by key/value pairs for easy lookup
					var options = backend.regroup(client.plugins['Door Unlocker'].options, 'name', 'value');
					if(options['Unlock duration'] == undefined) options['Unlock duration'] = 3;
					superSerial.send(client.clientID, UNLOCK, options['Unlock duration']);
					
					broadcaster.broadcast(module.exports, "door-unlocked", { 'client': client, 'user': null });
					
					if(callback) callback();
				}catch(exc){
					backend.error(exc);
				}
			},
			'Lock': function(client, callback){
				superSerial.send(client.clientID, LOCK);
				
				if(callback) callback();
			},
		},
		optionUpdated: function(client, option, newValue, oldValue, callback){
			// if no other clients are using the same authorization token, delete it from the database
			// if the tag doesn't exist, add it to the database
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
				
				if(!findDuplicateTag(oldValue)){
					backend.deleteAuthorizationTag(oldValue, module.exports.name);
				}
				if(!findDuplicateTag(newValue)){
					backend.registerAuthorizationTag(newValue, '', module.exports.name);
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
	},
	
	receiveMessage: function(source, messageID, data){
		if(messageID == 'serial-data-received'){
			if(data['to'] == 0){
				if(data['function'] == NFC){
					var client = backend.getClientByID(data['from']);
					var options = backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
					
					var nfc = data['data'].map(function(x) { return x.toString(16); }).join('');
					
					var unlock = function(){
						superSerial.send(client.clientID, UNLOCK, options['Unlock duration']);
						// @TODO: add user
						backend.log(client.name, null, nfc, 'unlock');
					};
					var deny = function(){
						superSerial.send(client.clientID, DENY, options['Unlock duration']);
						backend.log(client.name, null, nfc, 'deny');
					};
					
					backend.checkAuthorizationByNFC(nfc, options['Authorization tag'], unlock, deny);
				}
			}
		}
	},
};
