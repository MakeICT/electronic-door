var superSerial = require('../mcp-plugin-super-serial');

// this is only needed for backend.regroup convenience
var backend = require('../../backend.js');

module.exports = {
	name: 'Door Unlocker',
	options: {},
	actions: {
		'Unlock all': function(){
			// @TODO: implement "Unlock all" function
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
				// regroup the options by key/value pairs for easy lookup
				var options = backend.regroup(client.plugins['Door Unlocker'].options, 'name', 'value');
				
				superSerial.send(client.clientID, 0x01, options['unlockDuration']);
				
				if(callback) callback();
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
