
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var app = angular.module('masterControlApp', ['ui.bootstrap']);

app.factory('ajaxChecker', function() {
    var ajaxChecker = {
		'errorListeners': [],
		'checkAjax': function(response){
			if(response.error){
				ajaxChecker.error = {
					'message': response.error,
					'detail': response.detail,
				};

				for(var i=0; i<ajaxChecker.errorListeners.length; i++){
					ajaxChecker.errorListeners[i](ajaxChecker.error);
				}
				
				return false;
			}else if(response.url){
				window.open(response.url);
			}
			
			return true;
		},
		'addErrorListener': function(callback){
			ajaxChecker.errorListeners.push(callback);
		},
	};
	
	return ajaxChecker;
});

app.factory('authenticationService', function($http, ajaxChecker) {
    var authService = {
		'authenticated': false,
		'login': function(credentials, onPass, onFail) {
			$http.post('/login', credentials).success(function(response){
				if(ajaxChecker.checkAjax(response)){
					authService.authenticated = true;
					if(onPass) onPass();
				}else{
					if(onFail) onFail(response);
				}
			});
		},
		'isAuthenticated': function() {
			return authService.authenticated;
		},
	};
	
	return authService;
});

app.controller('controller', function($scope, $http, $location, authenticationService, ajaxChecker){
	$scope.blah = 'hi';
	$scope.error = null;

	$scope.doLoad = function(){
		var addMessage = function(type, message){
			var date = new Date();
			var time = pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2);
			$scope.messages.push({type:type, text: message, timestamp: time});
			$scope.$apply();
		};

		$scope.tabs = {};
		var path = $location.path().substring(1).split('/');
		if(path != ''){
			$scope.tabs[path] = { active: true };
		}
		
		$scope.setLocation = function(path){
			$location.path(path);
			if(path == 'log' && !$scope.log){
				$scope.loadLog();
			}
		}
	};
	
	$scope.clearError = function(){
		$scope.error = null;
	};

	$scope.login = function(){
		authenticationService.login(
			$scope.loginForm, 
			function(){
				$scope.clearError();
				$scope.authenticated = true;
			}
		);
	};

	ajaxChecker.addErrorListener(function(error){
		$scope.error = error;
	});
	authenticationService.login(null, function(){ $scope.authenticated = true; });
});

app.filter('timestampToHumanReadableDate', function(){
	var monthList = ["January" , "February" , "March" , "April" , "May" , "June" , "July" , "August" , "September" , "October" , "November" , "December"]

	return function(timestamp, showTime){
		var date = new Date(timestamp * 1000);
		var humanReadable = date.getFullYear() + '-' + monthList[date.getMonth()]  + '-' + pad(date.getDate(), 2);
		if(showTime){
			humanReadable += ' ' + pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2);
		}
		return humanReadable;
	}
});

app.filter('timestampToHumanReadableDuration', function(){
	return function(timestamp){
		var currentUnixTime = Math.round((new Date()).getTime() / 1000);
		var durationInUnix = currentUnixTime - timestamp;
		var durationInDays = Math.floor(durationInUnix / 86400);
		
		if(durationInDays > 365){
			return Math.round(durationInDays / 365, 1) + ' years';
		}else if(durationInDays > 90){
			return Math.round(durationInDays / 7, 1) + ' weeks';
		}else{
			return durationInDays + ' days';
		}
	}
});

app.directive('toggle', function() {
	return {
		require: 'ngModel',
		restrict: 'A',
		scope: { ngModel: '=' },
		link: function postLink(scope, element, attributes) {
			element.bind('click', function(event){
				scope.ngModel = !scope.ngModel;
				if(scope.ngModel){
					element.addClass('active');
				}else{
					element.removeClass('active');
				}

				scope.$apply();
			});
		},
	}
});

app.directive('actionWithParameters', function() {
	return {
		restrict: 'E',
		scope: {
			'properties': '=',
			'execute': '&',
		},
		templateUrl: '/templates/actionWithParameters.html',
	}
});

app.directive('jobActionSelector', function() {
	return {
		restrict: 'E',
		scope: {
			'job': '=',
		},
		templateUrl: '/templates/jobActionSelector.html',
	}
});
