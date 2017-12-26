app.controller('groupsCtrl', function($scope, $http, authenticationService, ajaxChecker){
	$scope.newGroup = {
		'name': '',
		'description': '',
	};

	$scope.setGroupAuthorization = function(group, authTag, authorized){
		var method;
		if(authorized){
			method = $http.put;
		}else{
			method = $http.delete;
		}

		method('/api/groups/' + group.groupID + '/authorizations/' + authTag).then(function(response){
			if(ajaxChecker.checkAjax(response)){
				for(var i=0; i<group.authorizations.length; i++){
					if(group.authorizations[i].name == authTag){
						group.authorizations[i].authorized = authorized;
					}
				}
			}
		});		
	};
		
	$scope.saveNewGroup = function(){
		if(!$scope.newGroup || $scope.newGroup.name == ''){
			$scope.error = {
				'message': 'Group name must be specified',
				'detail': '...so type something in.',
			};
		}else{
			$http.post('/api/groups/', $scope.newGroup).then(function(response){
				if(ajaxChecker.checkAjax(response)){
					$scope.newGroup = {'name': null, 'description': null };
					$http.get('/api/groups/').then(function(response){
						if(ajaxChecker.checkAjax(response)){
							$scope.groups = response.data;
						}
					});
				}
			}, function(error){
				$scope.error = {
					'message': 'Failed to add group',
					'detail': error.code + ": " + error.message,
				};
			});
		}
	};
	
	$scope.removeGroup = function(group){
		$http.delete('/api/groups/' + group.groupID).then(function(response){
			$scope.groups.splice($scope.groups.indexOf(group), 1);
		}, function(error){
			$scope.error = {
				'message': 'Failed to delete group',
				'detail': error.code + ": " + error.message,
			};
		});
	};

	$http.get('/api/groups/').then(function(response){
		if(ajaxChecker.checkAjax(response)){
			$scope.groups = response.data;
		}
	});
});

app.filter('encodeURIComponent', function() {
	return window.encodeURIComponent;
});
