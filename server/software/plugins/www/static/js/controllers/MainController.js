
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var app = angular.module('masterControlApp', ['ui.bootstrap', 'ngRoute']);

app.run(['$route', function($route)  {
	$route.reload();
}]);

app.config(function($locationProvider, $routeProvider) {
	$routeProvider.when('/users', {
		templateUrl : 'templates/users.html',
		controller  : 'usersCtrl'
	}).when('/groups', {
		templateUrl : 'templates/groups.html',
		controller  : 'groupsCtrl'
	}).when('/clients', {
		templateUrl : 'templates/clients.html',
		controller  : 'clientsCtrl'
	}).when('/log', {
		templateUrl : 'templates/log.html',
		controller  : 'logCtrl'
	}).when('/plugins', {
		templateUrl : 'templates/plugins.html',
		controller  : 'pluginsCtrl'
	}).when('/scheduler', {
		templateUrl : 'templates/scheduler.html',
		controller  : 'schedulerCtrl'
	}).otherwise('/users');
	
	$locationProvider.hashPrefix();
	$locationProvider.html5Mode(true);
});

app.factory('ajaxChecker', function() {
    var ajaxChecker = {
		'errorListeners': [],
		'checkAjax': function(response, quietError){
			if(response.data.error){
				if(!quietError){
					ajaxChecker.error = {
						'message': response.data.error,
						'detail': response.data.detail,
					};

					for(var i=0; i<ajaxChecker.errorListeners.length; i++){
						ajaxChecker.errorListeners[i](ajaxChecker.error);
					}
				}
				
				return false;
			}else if(response.data.url){
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
		'login': function(credentials, onPass, onFail, beQuiet) {
			$http.post('/api/login', credentials).then(function(response){
				if(ajaxChecker.checkAjax(response, beQuiet)){
					authService.authenticated = true;
					if(onPass) onPass();
				}else{
					if(onFail) onFail(response.data);
				}
			});
		},
	};
	
	return authService;
});

app.factory('tunePlayer', function() {
    var tunePlayer = {
		'hexStringToByteArray': function(str){
			var result = [];
			while(str && str.length >= 2) { 
				result.push(parseInt(str.substring(0, 2), 16));
				str = str.substring(2, str.length);
			}

			return result;
		},
		'audioCtx': new (window.AudioContext || window.webkitAudioContext)(),
		'play': function(notes, durations){
			if(!durations){
				notes = tunePlayer.hexStringToByteArray(notes);
				durations = notes.splice(notes.length/2, notes.length/2);
			}
			var noteID = 0;
			var oscillator;
			
			var noteLookup = [0,33,35,37,39,41,44,46,49,52,55,58,62,65,69,73,78,82,87,93,98,104,110,117,123,131,139,147,156,165,175,185,196,208,220,233,247,262,277,294,311,330,349,370,392,415,440,466,494,523,554,587,622,659,698,740,784,831,880,932,988,1047,1109,1175,1245,1319,1397,1480,1568,1661,1760,1865,1976,2093,2217,2349,2489,2637,2794,2960,3136,3322,3520,3729,3951,4186,4435,4699,4978];
			var playNote = function(){
				if(oscillator) oscillator.stop();
				
				noteID++;
				if(noteID >= notes.length) return;

				var note = notes[noteID];
				if(note > 0){
					oscillator = tunePlayer.audioCtx.createOscillator();
					oscillator.connect(tunePlayer.audioCtx.destination);
					oscillator.type = 'sine';
					oscillator.frequency.value = noteLookup[note]; // value in hertz
					oscillator.start(0);
				}
				setTimeout(playNote, durations[noteID] * 20);
			};
			playNote();
		},
	};
	return tunePlayer;
});

app.controller('controller', function($scope, $http, $location, authenticationService, ajaxChecker){
	$scope.blah = 'hi';
	$scope.error = null;
	$scope.pages = [
		{'label': 'Users', 'url': '/users'},
		{'label': 'Groups', 'url': '/groups'},
		{'label': 'Clients', 'url': '/clients'},
		{'label': 'Plugins', 'url': '/plugins'},
		{'label': 'Jobs', 'url': '/scheduler'},
		{'label': 'Log', 'url': '/log'}
	];

	$scope.doLoad = function(){
		var addMessage = function(type, message){
			var date = new Date();
			var time = pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2);
			$scope.messages.push({type:type, text: message, timestamp: time});
			$scope.$apply();
		};
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
	
	$scope.isPageActive = function(location){
		return location == $location.path();
	};

	ajaxChecker.addErrorListener(function(error){
		$scope.error = error;
	});
	
	authenticationService.login(null, function(){ $scope.authenticated = true; }, null, true);
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

app.directive('simpleToggle', function() {
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


app.directive('autofocus', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    link : function($scope, $element) {
      $timeout(function() {
        $element[0].focus();
      });
    }
  }
}]);
