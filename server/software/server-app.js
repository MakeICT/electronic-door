var fs = require('fs');
var restify = require('restify');
var backend = require('./backend.js');
var broadcaster = require('./broadcast.js');
var sessionManager = require('./simple-session.js');

broadcaster.broadcast('hi');
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
			io.emit(messageID, message.toString());
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
			var user = request.body;
			user.userID = request.params.userID;
			backend.updateUser(request.body, function(){ response.send(); });
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

server.post('/groups', function(request, response, next){
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.addGroup(
			request.params.name, request.params.description,
			function(result){
				response.send(result);
			},
			function(error){
				response.send(error);
			}
		);
	}
	
	return next();
});

server.del('/groups/:groupID', function(request, response, next){
	var session = checkIfLoggedIn(request, response);
	if(session){
		try{
			backend.deleteGroup(
				request.params.groupID,
				function(result){
					response.send(result);
				},
				function(error){
					backend.error(error);
					response.send(error);
				}
			);
		}catch(exc){
			backend.error(exc);
			response.send({'error': 'Failed to perform client plugin action', 'detail': exc});
		}
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
			},
			function(error){
				response.send(error.detail);
			}
		);
		response.send();
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

server.get('/plugins/:plugin/handler', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		var plugin = backend.getPluginByName(request.params.plugin);
		plugin.handleRequest(request, response);
		next();
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

server.get('/plugins/:plugin/options/:option', function (request, response, next) {
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
		try{
			var action;
			
			var actions = backend.getPluginByName(request.params.plugin).actions;
			for(var i=0; i<=actions.length; i++){
				var searchAction = actions[i];
				if(searchAction.name == request.params.action){
					action = searchAction;
					break;
				}
			}
			action.execute(request.body, session);
		}catch(exc){
			backend.error(exc);
			response.send({'error': 'Failed to perform plugin action', 'detail': exc});
		}
	}
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

// update a client
server.put('/clients/:clientID', function(request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.updateClient(request.params.clientID, request.body);
		response.send();
	}
	
	return next();
});

server.del('/clients/:clientID', function(request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.removeClient(request.params.clientID);
		response.send();
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

server.del('/clients/:clientID/plugins/:pluginName', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.disassociateClientPlugin(
			request.params.clientID,
			request.params.pluginName,
			function(){ response.send(); },
			function(error){ response.send({'error': 'Failed to disassociate plugin from client', 'detail': error.detail}); }
		);
	}
	return next();
});

server.post('/clients/:clientID/plugins/:pluginName/actions/:action', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		try{
			var client = backend.getClientByID(request.params.clientID);
			var plugin = backend.getPluginByName(request.params.pluginName);
			var action;
			for(var i=0; i<= plugin['clientDetails']['actions'].length; i++){
				var searchAction = plugin['clientDetails']['actions'][i];
				if(searchAction.name == request.params.action){
					action = searchAction;
					break;
				}
			}
			action.execute(request.body, client, function(){ response.send(); });			
		}catch(exc){
			var errorDetails = {'error': 'Failed to perform client plugin action', 'detail': exc.toString()};
			backend.error(errorDetails);
			response.send(errorDetails);
		}
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

server.get('/scheduledJobs', function(request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.getScheduledJobs(function(data){ response.send(data); });
	}
	
	return next();
});

server.post('/scheduledJobs', function(request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		var parameters = request.body.action ? request.body.action.parameters : [];
		var pluginID = request.body.action.plugin ? request.body.action.plugin.pluginID : null;
		var clientID = request.body.action.client ? request.body.action.client.clientID : null;
		
		backend.createJob(
			request.body.description, request.body.cron,
			request.body.action.name, parameters,
			pluginID, clientID,
			function(){
				response.send();
			},
			function(error){
				response.send({
					'error': 'Failed to create job',
					'detail': error,
				});
			}
		);
	}
	
	return next();
});

server.put('/scheduledJobs/:jobID', function(request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		var parameters = request.body.action ? request.body.action.parameters : [];
		var pluginID = request.body.action.plugin ? request.body.action.plugin.pluginID : null;
		var clientID = request.body.action.client ? request.body.action.client.clientID : null;

		backend.updateJob(
			request.params.jobID,
			request.body.description, request.body.cron,
			request.body.action.name, parameters,
			pluginID, clientID,
			function(){
				response.send();
			},
			function(error){
				response.send({
					'error': 'Failed to create job',
					'detail': error,
				});
			}
		);
	}
	
	return next();
});

server.put('/scheduledJobs/:jobID/enabled', function (request, response, next) {
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.setJobEnabled(
			request.params.jobID, request.params.value,
			function(){
				response.send();
			},
			function(error){
				response.send(error);
			}
		);
	}
	
	return next();
});

server.del('/scheduledJobs/:jobID', function(request, response, next){
	var session = checkIfLoggedIn(request, response);
	if(session){
		backend.deleteJob(
			request.params.jobID,
			function(){
				response.send();
			},
			function(error){
				response.send(error);
			}
		);
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
		
		if(!request.params.email || !request.params.password || request.params.email == '' || request.params.password == ''){
			response.send({'error': 'Login failed'});
		}else{
			backend.checkPassword(request.params.email, request.params.password, loginOK, loginBad);
		}
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
