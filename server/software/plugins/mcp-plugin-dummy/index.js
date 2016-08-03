var backend = require('../../backend.js');

function getClientOptions(client){
	return backend.regroup(client.plugins[module.exports.name].options, 'name', 'value');
}

module.exports = {
	name: 'Dummy plugin',
	options: [{
		'name': 'Plugin option',
		'type': 'text',
		'value': 'plugin option value',
	}],
	actions: [
		{
			'name': 'Foo',
			'parameters': [{
				'name': 'Foo option',
				'type': 'text',
				'value': 'fooooo',
			}],
			'execute': function(parameters, callback){
				backend.getPluginOptions(module.exports.name, function(pluginOptions){
					backend.log('Dummy plugin action: Foo');
					backend.log('    Plugin option  : ' + pluginOptions['Plugin option']);
					backend.log('    Foo parameter  : ' + parameters['Foo option']);
					
					if(callback) callback();
				});
			},
		}
	],
	clientDetails: {
		options: [{
			'name': 'Client option',
			'type': 'text',
			'value': 'client option value',
		}],
		actions: [{
			'name': 'Bar',
			'parameters': [{
				'name': 'Bar option',
				'type': 'text',
				'value': 'baaaaaar'
			}],
			'execute': function(parameters, client, callback){
				backend.getPluginOptions(module.exports.name, function(pluginOptions){
					var clientOptions = getClientOptions(client);
					backend.log('Dummy client action: Bar');
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
	onEnable: function(){},
	onDisable: function(){},
	
	handleRequest: function(request, response){},
};
