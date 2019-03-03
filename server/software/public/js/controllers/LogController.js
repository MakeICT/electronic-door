app.controller('logCtrl', function($scope, $http, authenticationService, ajaxChecker){
	$scope.filterExpanded=false;
	$scope.pageNumber=1;
	$scope.pageNumberBox=1;

	$scope.loadLog = function(params){
		$scope.log = null;
		params='';
		if($scope.firstNameFilter)
			params = params + "firstName+eq+" + $scope.firstNameFilter;		
		if($scope.lastNameFilter){
			if(params)
				params = params + "+and+";
			params = params + "lastName+eq+" + $scope.lastNameFilter;
		}
		if($scope.logTypeFilter){
			if(params)
				params = params + "+and+";
			params = params + "logType+eq+" + $scope.logTypeFilter;
		}
		params = '$filter=' + params;
		params += "&$page=" + $scope.pageNumberBox;
		$http.get('/api/log?'+params).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.log = response;
			}
		});
	};

	$scope.toggleFilters = function(){
		$scope.filterExpanded = !$scope.filterExpanded;
	}

	$scope.setPage = function(num){
		$scope.pageNumber = parseInt(num);
		$scope.pageNumberBox = parseInt(num);
		$scope.loadLog();
	}
	
	$scope.loadLog();
});
