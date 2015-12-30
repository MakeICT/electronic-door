superSerial = null;

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
			'Unlock': function(client){
				superSerial.send(client.id, 0x01, client.options['unlockDuration']);
			}, 'Lock': function(){
				superSerial.send(client.id, 0x02);
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
