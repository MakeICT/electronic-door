app.controller('logCtrl', function($scope, $http, authenticationService){
	$scope.loadLog = function(){
		$scope.log = null;
		$http.get('/log').success(function(response){
			if($scope.checkAjax(response)){
				$scope.log = response;
			}
		});
	};
});
