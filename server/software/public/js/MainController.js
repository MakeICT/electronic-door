var app = angular.module('electronic-door', ['ui.bootstrap']);
angular.module('electronic-door').controller('controller', function($scope, $http){
	$scope.plugins = {};
	$scope.clientPlugins = [];
	$scope.clients = {};
	
	$http.get('/plugins').success(function(plugins){
		for(var pluginName in plugins){
			var plugin = plugins[pluginName];
			console.log(plugin);
			$scope.plugins[pluginName] = plugin;

			var attachOptions = function(response){
				$scope.plugins[response.plugin].options = {};
				for(var i in response.options){
					if(response.options[i].type != 'hidden'){
						$scope.plugins[response.plugin].options[i] = response.options[i];
					}
				}
			};
			$http.get('/plugins/' + pluginName + '/options').success(attachOptions);
			
			if(plugin.clientDetails){
				$scope.clientPlugins.push(plugin);
			}
		}
	});

	$http.get('/clients').success(function(clients){
		for(var clientName in clients){
			var client = clients[clientName];
			$scope.clients[client.clientName] = client;
		}
	});

	$scope.locals = {
		'authenticated': true,
	};
	$scope.search = {
		'admin': false,
		'active': true,
		'keyed': false,
		'thirtyDays': false,
	};

	$scope.searchForUser = function(){
		// @TODO: encode search string
		var params = {}
		if($scope.search.query && $scope.search.query != '') params['q'] = $scope.search.query;
		if($scope.search.admin) params['isAdmin'] = 1;
		if($scope.search.active) params['status'] = 'active';
		if($scope.search.keyed) params['keyActive'] = 1;
		if($scope.search.thirtyDays){
			var today = new Date();
			var thirtyDaysAgo = (new Date()).setDate(today.getDate()-30);
			params['joinDate'] = Math.floor(thirtyDaysAgo / 1000);
		}

		var url = '/users?';
		for(var p in params){
			url += p + '=' + params[p] + '&';
		}
		$http.get(url).success(function(users){
			$scope.userSearchResults = users;
		});
	};



	$scope.userSearchResults = [];
	$scope.currentUser = null;
	$scope.newUser = {
		'email': '',
		'firstName': '',
		'lastName': '',
		'joinDate': new Date(),
	};

	$scope.setCurrentUser = function(user){
		$scope.currentUser = user;
	};

	$scope.resetNewUser = function(){
		$scope.newUser.email = null;
		$scope.newUser.firstName = null;
		$scope.newUser.lastName = null;
		$scope.newUser.joinDate = new Date();
	};

	$scope.saveNewUser = function(){
		$http.post('/users', $scope.newUser).success(function(response){
			if(response != ''){
				alert('Failed to add user:\n' + response);
			}else{
				alert('Added!');
				$scope.resetNewUser();
			}
		});
	};

	$scope.togglePlugin = function(plugin, enabled){
		$http.put('/plugins/' + plugin.name + '/enabled', {value:enabled}).success(function(response){
			if(response != ''){
				alert('Failed to toggle plugin:\n' + response);
			}
		});
	};

	$scope.savePluginOption = function(plugin, option){
		$http.put('/plugins/' + plugin.name + '/options/' + option.name, {value:option.value}).success(function(response){
			if(response != ''){
				alert('Failed to save option:\n' + response);
			}
		});
	};

	$scope.doPluginAction = function(plugin, action){
		$http.post('/plugins/' + plugin.name + '/actions/' + action).success(function(response){
			if(response != ''){
				alert('Failed to perform plugin action:\n' + response);
			}
		});
	};
	
	$scope.createClientPluginAssociation = function(client, pluginName){
		$http.post('/clients/' + client.clientID + '/plugins/' + pluginName).success(function(response){
			console.log("associated!");
			window.location.reload();
		});
	};
	
	$scope.doClientPluginAction = function(client, plugin, action){
		console.log(plugin);
		$http.post('/clients/' + client.clientID + '/plugins/' + plugin.name + '/actions/' + action).success(function(response){
			if(response != ''){
				alert('Failed to perform client action:\n' + response);
			}
		});
	};

})
.filter('memberSinceHumanReadable', function(){
	return function(memberSinceUnix){
		var memberSinceUnixMM = new Date(memberSinceUnix * 1000);
		var humanDate = memberSinceUnixMM.toISOString(); // Returns "2013-05-31T11:54:44.000Z"
		var monthList = ["January" , "February" , "March" , "April" , "May" , "June" , "July" , "August" , "September" , "October" , "November" , "December"]
		var month = (monthList[(Math.floor(humanDate.substring(5,7))-1)]);
		var day = humanDate.substring(8,10);
		var year = humanDate.substring(0,4);
		var finalDate = (month + " " + day + ", " + year);
		return finalDate;
	}
})
.filter('memberForHumanReadable', function(){
	return function(memberSinceUnix){
		var currentUnixTime = Math.round((new Date()).getTime() / 1000);
		var memberForUnix = currentUnixTime - memberSinceUnix;
		var memberForDays = Math.floor(memberForUnix / 86400);
		return memberForDays;
	}
});

app.directive('toggle', function() {
	return {
		require: 'ngModel',
		restrict: 'A',
		scope: { ngModel: '=' },
		link: function postLink(scope, element, attributes) {
			element.bind('click', function(event){
				scope.ngModel = !scope.ngModel;
				if(scope.ngModel){
					element.addClass('active');
				}else{
					element.removeClass('active');
				}

				scope.$apply();
			});
		},
	}
});
