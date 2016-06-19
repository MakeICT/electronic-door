app.controller('usersCtrl', function($scope, $http, authenticationService, ajaxChecker, consoleService){
	$scope.searchForUser = function(){
		// @TODO: encode search string
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

		var url = '/users?';
		for(var p in params){
			url += p + '=' + params[p] + '&';
		}
		$http.get(url).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				for(var i=0; i<response.length; i++){
					response[i].joinDate *= 1000;
					response[i].birthdate *= 1000;
				}
				$scope.userSearchResults = response;
			}
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
			if(ajaxChecker.checkAjax(response)){
				$scope.resetNewUser();
			}
		});
	};
	
	$scope.setGroupEnrollment = function(user, groupName, enrolled){
		$http.put('/users/' + user.userID + '/groups/' + groupName, enrolled).success(function(response){
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
		var url = '/users/' + user.userID + '/password';
		$http.put(url, {'password': user.password}).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				user.passwordSaved = true;
			}
		});
	};
	
	$scope.toggleUserStatus = function(user){
		var newStatus = (user.status == 'inactive' ? 'active' : 'inactive');
		$http.put('/users/' + user.userID, {'status': newStatus}).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				user.status = newStatus;
			}
		});
	};
	
	$scope.toggleKeyEnrollment = function(user){
		if(user.keyActive){
			$http.put('/users/' + user.userID, {'nfcID': null}).success(function(response){
				if(ajaxChecker.checkAjax(response)){
					user.keyActive = false;
				}
			});
		}else{
			$http.get('/log?type=nfc').success(function(response){
				if(ajaxChecker.checkAjax(response)){
					$scope.nfcLog = response;
				}
			});
		}
	};
	
	$scope.enrollUser = function(user, nfcID){
		$http.put('/users/' + user.userID, { nfcID: nfcID }).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.nfcLog = null;
				user.keyActive = true;
			}
		});
	};

	$scope.toggleUserDisplay = function(user){
		user.isExpanded = !user.isExpanded;
		if(!user.groups){
			$http.get('/users/' + user.userID + '/groups').success(function(response){
				if(ajaxChecker.checkAjax(response)){
					user.groups = response;
				}
			});
		}
	};
	
	$scope.saveUserJoinDate = function(user){
		user.joinDateSaving = true;
		var timestamp = (new Date(user.joinDate)).getTime() / 1000 | 0;
		$http.put('/users/' + user.userID, {'joinDate': timestamp}).success(function(response){
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
		$http.put('/users/' + user.userID, {'birthdate': timestamp}).success(function(response){
			ajaxChecker.checkAjax(response);
			user.birthdateSaving = false;
		}).catch(function(exc){
			user.birthdateSaving = false;
			consoleService.addMessage('error', exc);
		});
	};
});
