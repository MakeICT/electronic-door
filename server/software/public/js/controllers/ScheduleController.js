app.controller('schedulerCtrl', function($scope, $http, ajaxChecker, pluginService, clientService, consoleService){
	$scope.scheduledJobs = [];
	
	$scope.pluginActions = [];
	$scope.clientActions = [];
	
	$scope.pluginsLoaded = false;
	$scope.clientsLoaded = false;

	pluginService.addOnLoadListener(function(){
		$scope.pluginsLoaded = true;
		$scope.load();
	});
	
	clientService.addOnLoadListener(function(){
		$scope.clientsLoaded = true;
		$scope.load();
	});
	
	$scope.load = function(){
		if(!$scope.pluginsLoaded || !$scope.clientsLoaded) return;
		
		for(var pluginName in pluginService.plugins){
			var plugin = pluginService.plugins[pluginName];
			for(var j=0; j<plugin.actions.length; j++){
				var action = plugin.actions[j];
				var actionCopy = JSON.parse(JSON.stringify(action));
				actionCopy.plugin = plugin;
				actionCopy.plugin.pluginID = plugin.pluginID;
				$scope.pluginActions.push(actionCopy);
			}
		}
		
		for(var i=0; i<clientService.clients.length; i++){
			var client = clientService.clients[i];
			for(var pluginName in client.plugins){
				var plugin = client.plugins[pluginName];
				for(var j=0; j<plugin.actions.length; j++){
					var action = plugin.actions[j];
					var actionCopy = JSON.parse(JSON.stringify(action));
					
					actionCopy.client = client;
					actionCopy.plugin = plugin;
					
					$scope.clientActions.push(actionCopy);
				}				
			}
		}
		
		$scope.determineJobActions();
	};
	
	$scope.setJobAction = function(job, action){
		var actionCopy = JSON.parse(JSON.stringify(action));
		job.action = actionCopy;
	};
	
	$scope.saveJob = function(job){
		$http.put('/scheduledJobs/' + job.jobID, job).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.reload();
			}
		}).catch(function(err){
			consoleService.addMessage('error', err.data.code + ': ' + err.data.message);
		});
	};
	
	$scope.createJob = function(job){
		$http.post('/scheduledJobs', job).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.reload();
			}
		}).catch(function(err){
			console.error(err);
		});
	};
	
	$scope.toggleJob = function(job, enabled){
		if(enabled === undefined){
			enabled = !job.enabled;
		}
		$http.put('/scheduledJobs/' + job.jobID + '/enabled', {value:enabled}).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				job.enabled = enabled;
			};
		}).catch(function(err){
			consoleService.addMessage('error', err.data.code + ': ' + err.data.message);
		});
	};

	$scope.determineJobActions = function(){
		if(!$scope.pluginsLoaded || !$scope.clientsLoaded) return;
		
		for(var i=0; i<$scope.scheduledJobs.length; i++){
			var job = $scope.scheduledJobs[i];
			if(job.clientID){
				for(var j=0; j<$scope.clientActions.length; j++){
					var action = $scope.clientActions[j];
					if(action.name == job.action && action.client.clientID == job.clientID && action.plugin.pluginID == job.pluginID){
						$scope.setJobAction(job, action);
						break;
					}
				}
			}else if(job.pluginID){
				for(var j=0; j<$scope.pluginActions.length; j++){
					var action = $scope.pluginActions[j];
					if(action.name == job.action && action.plugin.pluginID == job.pluginID){
						$scope.setJobAction(job, action);
						break;
					}
				}
			}
			if(job.action){
				job.action.parameters = job.parameters;
			}
		}
	};
	
	$scope.reload = function(){
		$http.get('/scheduledJobs').success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.scheduledJobs = response;
				$scope.scheduledJobs.push({
					'jobID': null,
					'description': '',
					'schedule': '',
					'enabled': false
				});
			}
			$scope.determineJobActions();
		});
		
	};
	
	$scope.reload();
});
