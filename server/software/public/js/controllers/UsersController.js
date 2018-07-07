app.controller('usersCtrl', function($scope, $http, $location, authenticationService, ajaxChecker, consoleService){
	$scope.userSearchResults = [];
	$scope.currentUser = null;
	$scope.newUser = {
		'email': '',
		'firstName': '',
		'lastName': '',
		'joinDate': new Date(),
	};

	$scope.searchForUser = function(){
		// @TODO: encode search string
		$scope.userSearchResults = null;
		
		var params = {}
		if($scope.search.query && $scope.search.query.length > 2) params['q'] = $scope.search.query;
		if($scope.search.admin) params['isAdmin'] = 1;
		if($scope.search.active) params['status'] = 'active';
		if($scope.search.keyed) params['keyActive'] = 1;
		if($scope.search.thirtyDays){
			var today = new Date();
			var thirtyDaysAgo = (new Date()).setDate(today.getDate()-30);
			params['joinDate'] = Math.floor(thirtyDaysAgo / 1000);
		}
		var noTerms = true;
		for(var k in params){
			noTerms = false;
			break;
		}
		if(noTerms) return;

		var url = '/api/users?';
		for(var p in params){
			url += encodeURIComponent(p) + '=' + encodeURIComponent(params[p]) + '&';
		}
		$http.get(url).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				for(var i=0; i<response.length; i++){
					response[i].joinDate *= 1000;
					response[i].birthdate *= 1000;
				}
				$scope.userSearchResults = response;
				if($scope.userSearchResults.length == 1){
					$scope.toggleUserDisplay($scope.userSearchResults[0]);
				}
			}
		});
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
		$http.post('/api/users', $scope.newUser).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.resetNewUser();
			}
		});
	};
	
	$scope.setGroupEnrollment = function(user, groupName, enrolled){
		$http.put('/api/users/' + user.userID + '/groups/' + encodeURIComponent(groupName), enrolled).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				for(var i=0; i<user.groups.length; i++){
					if(user.groups[i].name == groupName){
						user.groups[i].enrolled = enrolled;
						break;
					}
				}
				// @TODO: give feedback to user that this worked
			}
		});		
	};

	$scope.search = {
		'admin': false,
		'active': false,
		'keyed': false,
		'thirtyDays': false,
	};	

	$scope.resetPassword = function(user){
		user.passwordSaved = false;
		var url = '/api/users/' + user.userID + '/password';
		$http.put(url, {'password': user.password}).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				user.passwordSaved = true;
			}
		});
	};
	
	$scope.toggleUserStatus = function(user){
		var newStatus = (user.status == 'inactive' ? 'active' : 'inactive');
		$http.put('/api/users/' + user.userID, {'status': newStatus}).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				user.status = newStatus;
			}
		});
	};
	
	$scope.toggleKeyEnrollment = function(user){
		if(user.keyActive){
			$http.put('/api/users/' + user.userID, {'nfcID': null}).success(function(response){
				if(ajaxChecker.checkAjax(response)){
					user.keyActive = false;
				}
			});
		}else{
			$http.get('/api/log?type=nfc').success(function(response){
				if(ajaxChecker.checkAjax(response)){
					$scope.nfcLog = response;
				}
			});
			$http.get('/api/users/' + user.userID + '/nfcHistory').success(function(response){
				if(ajaxChecker.checkAjax(response)){
					console.log(response);
					user.nfcHistory = response;
				}
			});
		}
	};
	
	$scope.enrollUser = function(user, nfcID){
		$http.put('/api/users/' + user.userID, { nfcID: nfcID }).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.nfcLog = null;
				user.nfcHistory = null;
				user.keyActive = true;
				user.nfcID = nfcID;
			}
		});
	};

	$scope.toggleUserDisplay = function(user){
		user.isExpanded = !user.isExpanded;
		if(!user.groups){
			$http.get('/api/users/' + user.userID + '/groups').success(function(response){
				if(ajaxChecker.checkAjax(response)){
					user.groups = response;
				}
			});
		}
	};
	
	$scope.saveUserJoinDate = function(user){
		user.joinDateSaving = true;
		var timestamp = (new Date(user.joinDate)).getTime() / 1000 | 0;
		$http.put('/api/users/' + user.userID, {'joinDate': timestamp}).success(function(response){
			ajaxChecker.checkAjax(response);
			user.joinDateSaving = false;
		}).catch(function(exc){
			user.joinDateSaving = false;
			consoleService.addMessage('error', exc);
		});
	};
	
	$scope.saveUserBirthdate = function(user){
		user.birthdateSaving = true;
		console.log(user);
		var timestamp = (new Date(user.birthdate)).getTime() / 1000 | 0;
		$http.put('/api/users/' + user.userID, {'birthdate': timestamp}).success(function(response){
			ajaxChecker.checkAjax(response);
			user.birthdateSaving = false;
		}).catch(function(exc){
			user.birthdateSaving = false;
			consoleService.addMessage('error', exc);
		});
	};

	$scope.saveUserName = function(user){
		var update = {
			'firstName': user.firstName,
			'lastName': user.lastName,
		};
		
		$http.put('/api/users/' + user.userID, update).success(function(response){
			ajaxChecker.checkAjax(response);
		}).catch(function(exc){
			consoleService.addMessage('error', exc);
		});
	};

	$scope.saveUserEmail = function(user){
		$http.put('/api/users/' + user.userID, {'email': user.email}).success(function(response){
			ajaxChecker.checkAjax(response);
		}).catch(function(exc){
			consoleService.addMessage('error', exc);
		});
	};

	$scope.upSync = function(user){
		params = { 'Email': user.email };
		$http.post('/api/plugins/Wild%20Apricot%20Sync/actions/UpSync', params).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				// @TODO: give feedback
			}
		});
	};

	$scope.downSync = function(user){
		params = { 'Email': user.email };
		$http.post('/api/plugins/Wild%20Apricot%20Sync/actions/DownSync', params).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				user.stale = true;
			}
		});
	};

	if($location.search().q && $location.search().q.length > 0){
		$scope.search.query = $location.search().q;
		$scope.searchForUser();
	}
});
