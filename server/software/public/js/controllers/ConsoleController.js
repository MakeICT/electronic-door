app.factory('consoleService', function() {
    var consoleService = {
		'messages': [],
		'addMessage': function(type, message){
			var date = new Date();
			var time = pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2);
			consoleService.messages.push({type:type, text: message, timestamp: time});
		},
	};
	
	return consoleService;
});

app.controller('consoleCtrl', function($scope, $http, consoleService, authenticationService){
	$scope.socket = io();
	$scope.messages = consoleService.messages;

	$scope.socket.on('debug', function(message){
		consoleService.addMessage('debug', message);
	});
	$scope.socket.on('error', function(message){
		consoleService.addMessage('error', message);
	});
	$scope.socket.on('log', function(message){
		consoleService.addMessage('log', message);
	});

	$scope.clearMessages = function(){
		consoleService.messages.length = 0;
	};
});
