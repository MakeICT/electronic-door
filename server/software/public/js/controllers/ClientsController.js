app.controller('clientsCtrl', function($scope, $http, authenticationService, ajaxChecker){
	$scope.clients = [];
	$scope.updateClient = function(client){
		var oldID = client.oldID;
		$http.put('/clients/' + oldID, client).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				client.oldID = client.clientID;
				// @TODO: give feedback
			}
		});
	};
	
	$scope.removeClient = function(client){
		$http.delete('/clients/' + client.clientID).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				var index = $scope.clients.indexOf(client);
				$scope.clients.splice(index, 1);
			}
		});
	};
	
	$scope.createClientPluginAssociation = function(client){
		$http.post('/clients/' + client.clientID + '/plugins/' + client.newPlugin).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.reloadClients();
			}
		});
		client.newPlugin = null;
	};
	
	$scope.disassociatePlugin = function(client, plugin){
		$http.delete('/clients/' + client.clientID + '/plugins/' + plugin.name).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.reloadClients();
			}
		});
	};
	
	$scope.doClientPluginAction = function(client, plugin, action){
		$http.post('/clients/' + client.clientID + '/plugins/' + plugin.name + '/actions/' + action).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};
	
	$scope.saveClientPluginOption = function(client, plugin, option){
		var params = {'option': option.name, 'value': option.value};
		
		$http.put('/clients/' + client.clientID + '/plugins/' + plugin.name, params).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};

	$scope.reloadClients = function(){
		$http.get('/clients').success(function(response){
			if(ajaxChecker.checkAjax(response)){
				var clients = response;
				for(var i=0; i<clients.length; i++){
					clients[i].oldID = clients[i].clientID;
					
					var found = false;
					for(var j=0; j<$scope.clients.length; j++){
						if($scope.clients[j].clientID == clients[i].clientID){
							for(var k in clients[i]){
								$scope.clients[j][k] = clients[i][k];
							}
							console.log('found existing client');
							found = true;
							break;
						}
					}
					if(!found){
						$scope.clients.push(clients[i]);
					}
				}
			}
		});
	};

	$scope.reloadClients();
});
