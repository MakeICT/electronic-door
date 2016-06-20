app.controller('logCtrl', function($scope, $http, authenticationService, ajaxChecker){
	$scope.loadLog = function(){
		$scope.log = null;
		$http.get('/log').success(function(response){
			if(ajaxChecker.checkAjax(response)){
				$scope.log = response;
			}
		});
	};
});
