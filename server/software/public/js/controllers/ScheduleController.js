app.controller('schedulerCtrl', function($scope, $http, ajaxChecker, pluginService, clientService){
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
	};
	
	$scope.setJobAction = function(job, action){
		job.action = action		
		$scope.saveJob(job);
	};
	
	$scope.saveJob = function(job){
		if(!job.jobID) return;
		
		$http.put('/scheduledJobs/' + job.jobID, job).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.reload();
			}
		}).catch(function(err){
			console.error(err);
		});
	};
	
	$scope.createJob = function(job){
		$http.post('/scheduledJobs', job).success(function(response){
			if(ajaxChecker.checkAjax(response)){
//				$scope.reload();
			}
		}).catch(function(err){
			console.error(err);
		});
	};
	
	$scope.toggleJob = function(job, enabled){
		if(enabled === undefined){
			enabled = !job.enabled;
		}
		//$http
	};
	/*
	$scope.plugins = pluginService.plugins;
	$scope.clientPlugins = pluginService.clientPlugins;
	$scope.clients = clientService.clients;
	*/
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
		});
	};
	
	$scope.reload();
});
