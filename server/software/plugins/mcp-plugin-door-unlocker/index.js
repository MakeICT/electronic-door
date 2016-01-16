var broadcaster = require('../../broadcast.js');
var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

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
		},
		actions: {
			'Unlock': function(client, callback){
				try{
					// regroup the options by key/value pairs for easy lookup
					var options = backend.regroup(client.plugins['Door Unlocker'].options, 'name', 'value');
					if(options['unlockDuration'] == undefined) options['unlockDuration'] = 3;
					superSerial.send(client.clientID, 0x01, options['unlockDuration']);
					
					broadcaster.broadcast(module.exports, "door-unlocked", { client: client, user: null });
					
					if(callback) callback();
				}catch(exc){
					console.log(exc);
				}
			},
			'Lock': function(client, callback){
				superSerial.send(client.clientID, 0x02);
				
				if(callback) callback();
			},
		},
	},
	
	onInstall: function(){
	},

	onUninstall: function(){
	},
	
	onEnable: function(){
	},
	
	onDisable: function(){
	}
	
};
