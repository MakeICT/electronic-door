app.controller('pluginsCtrl', function($scope, $http, authenticationService, ajaxChecker){
	$scope.plugins = {};
	$scope.clientPlugins = [];
	
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
		$http.post('/plugins/' + plugin.name + '/actions/' + action).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};

	$scope.reloadPlugins = function(){
		$http.get('/plugins').success(function(response){
			if(ajaxChecker.checkAjax(response)){
				var plugins = response;
				for(var i=0; i<plugins.length; i++){
					var plugin = plugins[i];
					$scope.plugins[plugin.name] = plugin;
					var attachOptions = function(response){
						$scope.plugins[response.plugin].options = [];
						for(var i in response.options){
							if(response.options[i].type != 'hidden'){
								$scope.plugins[response.plugin].options[i] = response.options[i];
							}
						}
					};
					$http.get('/plugins/' + plugin.name + '/options').success(attachOptions);
					
					if(plugin.clientDetails){
						$scope.clientPlugins.push(plugin);
					}
				}
			}
		});
	};
	
	$scope.reloadPlugins();
});
