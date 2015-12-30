var superSerial = require('../mcp-plugin-super-serial');

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
				superSerial.send(client.clientID, 0x01, client.options['unlockDuration']);
				
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
