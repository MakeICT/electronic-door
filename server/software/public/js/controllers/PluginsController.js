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

	pluginService.load();
});
