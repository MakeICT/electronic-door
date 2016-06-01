app.controller('consoleCtrl', function($scope, $http, authenticationService){
	$scope.socket = io();
	$scope.messages = [];
	
	$scope.addMessage = function(type, message){
		var date = new Date();
		var time = pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2);
		$scope.messages.push({type:type, text: message, timestamp: time});
		$scope.$apply();
	};

	$scope.socket.on('debug', function(message){
		$scope.addMessage('debug', message);
	});
	$scope.socket.on('error', function(message){
		$scope.addMessage('error', message);
	});
	$scope.socket.on('log', function(message){
		$scope.addMessage('log', message);
	});

	$scope.clearMessages = function(){
		$scope.messages.length = 0;
	};
});
