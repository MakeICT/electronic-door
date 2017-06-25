app.controller('logCtrl', function($scope, $http, authenticationService, ajaxChecker){
	$scope.loadLog = function(params){
		$scope.log = null;
		$http.get('/api/log?'+params).success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.log = response;
			}
		});
	};
	
	$scope.loadLog();
});
