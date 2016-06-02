app.factory('pluginService', function($http, ajaxChecker) {
    var pluginService = {
		'plugins': {},
		'clientPlugins': [],
		'onLoadListeners': [],
		'addOnLoadListener': function(callback){
			pluginService.onLoadListeners.push(callback);
		},
		'load': function(){
			$http.get('/plugins').success(function(response){
				if(ajaxChecker.checkAjax(response)){
					var plugins = response;
					for(var i=0; i<plugins.length; i++){
						var plugin = plugins[i];

						pluginService.plugins[plugin.name] = plugin;
						var attachOptions = function(response){
							pluginService.plugins[response.plugin].options = [];
							for(var i in response.options){
								if(response.options[i].type != 'hidden'){
									pluginService.plugins[response.plugin].options[i] = response.options[i];
								}
							}
						};
						$http.get('/plugins/' + plugin.name + '/options').success(attachOptions);
						
						if(plugin.clientDetails){
							pluginService.clientPlugins.push(plugin);
						}
					}
					for(var i=0; i<pluginService.onLoadListeners.length; i++){
						pluginService.onLoadListeners[i]();
					}
				}
			});
		},
	};
	
	pluginService.load();
	
	return pluginService;
});

app.controller('pluginsCtrl', function($scope, $http, authenticationService, ajaxChecker, pluginService){
	$scope.plugins = pluginService.plugins;
	
	$scope.togglePlugin = function(plugin, enabled){
		$http.put('/plugins/' + plugin.name + '/enabled', {value:enabled}).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};

	$scope.savePluginOption = function(plugin, option){
		$http.put('/plugins/' + plugin.name + '/options/' + option.name, {value:option.value}).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};

	$scope.doPluginAction = function(plugin, action){
		var params = {};
		for(var i=0; i<action.parameters.length; i++){
			var param = action.parameters[i];
			params[param.name] = param.value;
		}
		
		$http.post('/plugins/' + plugin.name + '/actions/' + action.name, params).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};
});
