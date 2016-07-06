app.factory('consoleService', ["$rootScope", function($rootScope) {
    var consoleService = {
		'messages': [],
		'addMessage': function(type, message){
			var date = new Date();
			var time = pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2);
			consoleService.messages.push({type:type, text: message, timestamp: time});
			$rootScope.$apply();
			console.log(message);
		},
	};
	
	return consoleService;
}]);

app.controller('consoleCtrl', function($scope, consoleService){
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
