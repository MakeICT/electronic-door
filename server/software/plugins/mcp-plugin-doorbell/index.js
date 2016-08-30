var backend = require('../../backend.js');
var superSerial = require('../mcp-plugin-super-serial');
var broadcaster = require('../../broadcast.js');

function getClientOptions(client){
	return backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
}

module.exports = {
	name: 'Doorbell',
	options: [{
		'name': 'Default Tune',
		'type': 'tune',
		'value': '35003500350031003500380020060106060606060106060b110b',
	}],
	actions: {},
	clientDetails: {
		options: [{
			'name': 'Default Tune',
			'type': 'tune',
			'value': '35003500350031003500380020060106060606060106060b110b',
		}],
		actions: [{
			'name': 'Set Tune',
			'parameters': [{
				'name': 'Tune',
				'type': 'tune',
				'value': ''
			}],
			'execute': function(parameters, client, callback){
				backend.getPluginOptions(module.exports.name, function(pluginOptions){
					var clientOptions = getClientOptions(client);
					backend.log('Doorbell action: Set Tune');
					//backend.log('     Plugin option : ' + pluginOptions['Plugin option']);
					backend.log('     Client option : ' + clientOptions['Default Tune']);
					backend.log('     Doorbell parameter : ' + parameters['Tune']);
          
          if(parameters['Tune'] != ''){
						superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['DOORBELL']);
					}
					
					if(callback) callback();
				});
			}
		},
    {
			'name': 'Test Tune',
			'execute': function(parameters, client, callback){
				backend.getPluginOptions(module.exports.name, function(pluginOptions){
					var clientOptions = getClientOptions(client);
					backend.log('Doorbell action: Test Tune');
					backend.log('     Plugin option : ' + pluginOptions['Plugin option']);
					backend.log('     Client option : ' + clientOptions['Client option']);
					backend.log('     Bar parameter : ' + parameters['Bar option']);
					
					if(callback) callback();
				});
			}
		}]
	},

	onInstall: function(){},
	onUninstall: function(){},
	onEnable: function(){
    broadcaster.subscribe(module.exports);
  },
	onDisable: function(){},
	
	handleRequest: function(request, response){},
  
  receiveMessage: function(source, messageID, data){
    if (message == 'serial-data-received')  {
      backend.log("Was that a bell I heard?");
      backend.log(data);
      //superSerial.send(client.clientID, superSerial.SERIAL_COMMANDS['DOORBELL']);
    }
	},
};
