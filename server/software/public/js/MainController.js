function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var app = angular.module('electronic-door', ['ui.bootstrap']);
angular.module('electronic-door').controller('controller', function($scope, $http){
	$scope.plugins = {};
	$scope.clientPlugins = [];
	$scope.clients = {};
	
	$http.get('/plugins').success(function(plugins){
		for(var i=0; i<plugins.length; i++){
			var plugin = plugins[i];
			$scope.plugins[plugin.name] = plugin;
			var attachOptions = function(response){
				$scope.plugins[response.plugin].options = {};
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
	});

	$http.get('/clients').success(function(clients){
		$scope.clients = clients;
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
	
	$scope.getUserAuthorizations = function(user){
		$http.get('/users/' + user.userID + '/authorizations').success(function(response){
			console.log(response);
			user.authorizations = response;
		});
	};
	
	$scope.setUserAuthorization = function(user, authTag, authorized){
		$http.put('/users/' + user.userID + '/authorizations/' + authTag, authorized).success(function(response){
			// @TODO: give feedback to user that this worked
		});		
	};
	
	$scope.toggleKeyEnrollment = function(user){
		if(user.keyActive){
			$http.put('/users/' + user.userID, {nfcID: null}).success(function(response){
				user.keyActive = false;
			});
		}else{
			$http.get('/log?type=nfc').success(function(log){
				$scope.nfcLog = log;
			});
		}
	};
	
	$scope.enrollUser = function(user, nfcID){
		$http.put('/users/' + user.userID, { nfcID: nfcID }).success(function(response){
			$scope.nfcLog = null;
			user.keyActive = true;
		});
	};
	
	$scope.loadLog = function(){
		$http.get('/log').success(function(log){
			$scope.log = log;
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
			window.location.reload();
		});
	};
	
	$scope.doClientPluginAction = function(client, plugin, action){
		$http.post('/clients/' + client.clientID + '/plugins/' + plugin.name + '/actions/' + action).success(function(response){
			if(response != ''){
				alert('Failed to perform client action:\n' + response);
			}
		});
	};
	
	$scope.saveClientPluginOption = function(client, plugin, option){
		var params = {'option': option.name, 'value': option.value};
		
		$http.put('/clients/' + client.clientID + '/plugins/' + plugin.name, params).success(function(response){
		});
	};

})
.filter('timestampToHumanReadableDate', function(){
	var monthList = ["January" , "February" , "March" , "April" , "May" , "June" , "July" , "August" , "September" , "October" , "November" , "December"]

	return function(timestamp, showTime){
		var date = new Date(timestamp * 1000);
		var humanReadable = date.getFullYear() + '-' + monthList[date.getMonth()]  + '-' + pad(date.getDate(), 2);
		if(showTime){
			humanReadable += ' ' + pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2);
		}
		return humanReadable;
	}
})
.filter('timestampToHumanReadableDuration', function(){
	return function(timestamp){
		var currentUnixTime = Math.round((new Date()).getTime() / 1000);
		var durationInUnix = currentUnixTime - timestamp;
		var durationInDays = Math.floor(durationInUnix / 86400);
		
		return durationInDays;
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