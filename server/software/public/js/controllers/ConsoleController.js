app.controller('consoleCtrl', function($scope, $http, authenticationService){
	$scope.socket = io();
	$scope.messages = [];

	$scope.socket.on('debug', function(message){
		addMessage('debug', message);
	});
	$scope.socket.on('error', function(message){
		addMessage('error', message);
	});
	$scope.socket.on('log', function(message){
		addMessage('log', message);
	});

	$scope.clearMessages = function(){
		$scope.messages.length = 0;
	};
});
