app.factory('clientService', function($http, ajaxChecker) {
    var clientService = {
		'clients': [],
		'onLoadListeners': [],
		'addOnLoadListener': function(callback){
			clientService.onLoadListeners.push(callback);
		},
		'reload': function(){
			$http.get('/api/clients').success(function(response){
				if(ajaxChecker.checkAjax(response)){
					var clients = response;
					for(var i=0; i<clients.length; i++){
						clients[i].oldID = clients[i].clientID;
						
						var found = false;
						for(var j=0; j<clientService.clients.length; j++){
							if(clientService.clients[j].clientID == clients[i].clientID){
								for(var k in clients[i]){
									clientService.clients[j][k] = clients[i][k];
								}
								found = true;
								break;
							}
						}
						if(!found){
							clientService.clients.push(clients[i]);
						}
					}
					for(var i=0; i<clientService.onLoadListeners.length; i++){
						clientService.onLoadListeners[i]();
					}
				}
			});
		},
	};
	
	clientService.reload();
	
	return clientService;
});

app.controller('clientsCtrl', function($scope, $http, authenticationService, ajaxChecker, clientService, pluginService, tunePlayer){
	$scope.clients = clientService.clients;
	$scope.clientPlugins = pluginService.clientPlugins;
	
	$scope.updateClient = function(client){
		var oldID = client.oldID;
		$http.put('/api/clients/' + oldID, client).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				client.oldID = client.clientID;
				// @TODO: give feedback
			}
		});
	};
	
	$scope.removeClient = function(client){
		$http.delete('/api/clients/' + client.clientID).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				var index = $scope.clients.indexOf(client);
				$scope.clients.splice(index, 1);
			}
		});
	};
	
	$scope.createClientPluginAssociation = function(client){
		$http.post('/api/clients/' + client.clientID + '/plugins/' + client.newPlugin).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				clientService.reload();
			}
		});
		client.newPlugin = null;
	};
	
	$scope.disassociatePlugin = function(client, plugin){
		$http.delete('/api/clients/' + client.clientID + '/plugins/' + plugin.name).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				clientService.reload();
			}
		});
	};
	
	$scope.doClientPluginAction = function(client, plugin, action){
		var params = {};
		for(var i=0; i<action.parameters.length; i++){
			var param = action.parameters[i];
			params[param.name] = param.value;
		}
		$http.post('/api/clients/' + client.clientID + '/plugins/' + plugin.name + '/actions/' + action.name, params).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};
	
	$scope.saveClientPluginOption = function(client, plugin, option){
		var params = {'option': option.name, 'value': option.value};
		
		$http.put('/api/clients/' + client.clientID + '/plugins/' + plugin.name, params).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};
	
	$scope.playTune = function(tune){
		tunePlayer.play(tune);
	};
});
