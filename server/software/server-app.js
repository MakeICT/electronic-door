var fs = require('fs');
var restify = require('restify');
var backend = require('./backend.js');
var broadcaster = require('./broadcast.js');
var sessionManager = require('./simple-session.js');

var doneLoading = false;

var server = restify.createServer({
	certificate: fs.readFileSync('credentials/cert.pem'),
	key: fs.readFileSync('credentials/key.pem'),
	name: 'master-control-program',
});

var io = require('socket.io').listen(server.server);
broadcaster.subscribe({
	receiveMessage: function(source, messageID, message){
		if(messageID == 'log' || messageID == 'error' || messageID == 'debug'){
			io.emit(messageID, message);
		}
	},
});

server.use(restify.fullResponse());
server.use(restify.queryParser());
server.use(restify.bodyParser());

/**
 * #############
 * # REST
 * #############
 **/
function checkIfLoggedIn(request, response, suppressErrorResponse){
	var session = sessionManager.start(request, response);
	
	if(session.properties['authenticated']){
		return session;
	}else{
		if(!suppressErrorResponse){
			response.send({'error': 'Not logged in'});
		}
		return false;
	}
}; 

server.get('/users', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.getUsers(request.params.q, request.params.isAdmin, request.params.keyActive, request.params.joinDate, function(users){
			response.send(users);
		});
	}
	
	return next();
});

server.get('/users/:userID/authorizations', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.getUserAuthorizations(request.params.userID, function(auths){
			response.send(auths);
		});
	}		
	return next();
});

server.put('/users/:userID/authorizations/:authTag', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.setUserAuthorization(request.context.userID, request.context.authTag, request.body, function(){response.send();});
	}
	return next();
});

server.get('/users/:userID/groups', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.getUserGroups(request.params.userID, function(groups){
			response.send(groups);
		});
	}
	
	return next();
});

server.put('/users/:userID/groups/:groupName', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.setGroupEnrollment(request.context.userID, request.context.groupName, request.body, function(){response.send();});
	}
	return next();
});

server.put('/groups/:groupID/authorizations/:authTag', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.setGroupAuthorization(request.context.groupID, request.context.authTag, request.body, function(){response.send();});
	}
	return next();
});

server.put('/users/:userID/password', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.updateUserPassword(request.params.userID, request.body.password, function(){response.send();});
	}
	return next();
});

/**
 * Sends empty response on success
 * Sends a message 
 **/
server.post('/users', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		request.params.joinDate = parseInt(Date.parse(request.params.joinDate) / 1000);
		backend.addUser(
			request.params,
			function(result){
				response.send();
			},
			function(error){
				response.send(error.detail);
			}
		);
	}
	
	return next();
});

server.put('/users/:userID', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		if(request.params.nfcID !== undefined){
			backend.enrollUser(request.params.userID, request.params.nfcID, function(){ response.send(); });
		}else{
			response.send();
		}
	}	
	// @TODO: update other fields too...
	return next();
});

server.get('/groups', function(request, response, next){
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.getGroups(function(groups){
			response.send(groups);
		});
	}
	
	return next();
});

/**
 * Plugins
 **/
server.get('/plugins', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		response.send(backend.getPlugins());
	}
	return next();
});

server.put('/plugins/:plugin/enabled', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		var task = request.params.value ? backend.enablePlugin : backend.disablePlugin;
		var plugin = backend.getPluginByName(request.params.plugin);
		task(
			plugin.name,
			function(){
				if(request.params.value){
					plugin.onEnable();
				}else{
					plugin.onDisable();
				}
				response.send();
			},
			function(error){
				response.send(error.detail);
			}
		);
	}
		
	return next();
});

server.get('/plugins/:name/options', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.getOrderedPluginOptions(request.params.name, function(options){
			// sending the plugin name is back because of a weird front-end scoping issue
			// also, options here are ordered, so don't make a dict out of them.
			response.send({
				'plugin': request.params.name,
				'options': options,
			});
		});
	}		
	return next();
});

server.put('/plugins/:plugin/options/:option', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.setPluginOption(
			request.params.plugin, request.params.option, request.params.value,
			function(){
				response.send();
			},
			function(error){
				response.send(error.detail);
			}
		);
	}
			
	return next();
});

server.post('/plugins/:plugin/actions/:action', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.getPluginByName(request.params.plugin).actions[request.params.action]();
	}
	
	return next();
});


/**
 * Clients
 **/
server.get('/clients', function(request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		response.send(backend.getClients());
	}
	
	return next();
});

server.post('/clients/:clientID/plugins/:pluginName', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.associateClientPlugin(
			request.params.clientID,
			request.params.pluginName,
			function(){ response.send(); },
			function(error){ response.send({'error': 'Failed to associate plugin to client', 'detail': error.detail}); }
		);
	}
	return next();
});

server.post('/clients/:clientID/plugins/:pluginName/actions/:action', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		var client = backend.getClientByID(request.params.clientID);
		var plugin = backend.getPluginByName(request.params.pluginName);
		var action = plugin['clientDetails']['actions'][request.params.action];
		
		action(client, function(){ response.send(); });
	}
	
	return next();
});

server.put('/clients/:clientID/plugins/:pluginName', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.setClientPluginOption(
			request.params.clientID, request.params.pluginName, request.body.option, request.body.value,
			function(){
				response.send();
			},
			function(error){
				response.send({'error': error.detail});
			}
		);
	}

	return next();
});

server.get('/log', function(request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.getLog(request.params.type, function(data){ response.send(data); });
	}
	
	return next();
});

/**
 * #############
 * # Stuff
 * #############
 **/

server.post('/login', function(request, response, next){
	var session = sessionManager.start(request, response);
	
	if(session.properties['authenticated'] && !request.params.email && !request.params.password){
		response.send();
	}else{
		var loginOK = function(userID){
			backend.log('Successful login', userID);
			session.properties['authenticated'] = true;
			session.properties['userID'] = userID;
			
			response.end();
		};
		
		var loginBad = function(){
			backend.log('Failed login: ' + request.params.email)
			response.send({'error': 'Login failed'});
		};
		
		backend.checkPassword(request.params.email, request.params.password, loginOK, loginBad);
	}
	next();
});

server.get('/logout', function(request, response, next){
	var session = sessionManager.start(request, response);
	session.properties['authenticated'] = false;
	session.properties['userID'] = null;
	response.redirect('/', next);
});

// Serve static files for the web client
server.get(/.*/, restify.serveStatic({
	directory: 'public/',
	default: 'index.html'
}));

server.listen(443, function () {
	backend.log(server.name + ' listening at ' + server.url);
});
