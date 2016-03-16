var restify = require('restify');
var backend = require('./backend.js');
var broadcaster = require('./broadcast.js');
var sessionManager = require('./simple-session.js');

var doneLoading = false;

var server = restify.createServer({
//	certificate: fs.readFileSync('cert.pem'),
//	key: fs.readFileSync('key.pem'),
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
server.get('/users', function (request, response, next) {
	backend.getUsers(request.params.q, request.params.isAdmin, request.params.keyActive, request.params.joinDate, function(users){
		response.send(users);
	});
	
	return next();
});

server.get('/users/:userID/authorizations', function (request, response, next) {
	backend.getUserAuthorizations(request.params.userID, function(auths){
		response.send(auths);
	});
	
	return next();
});

server.put('/users/:userID/authorizations/:authTag', function (request, response, next) {
	backend.setUserAuthorization(request.context.userID, request.context.authTag, request.body, function(){response.send();});
	return next();
});

server.get('/users/:userID/groups', function (request, response, next) {
	backend.getUserGroups(request.params.userID, function(groups){
		response.send(groups);
	});
	
	return next();
});

server.put('/users/:userID/groups/:groupName', function (request, response, next) {
	backend.setGroupEnrollment(request.context.userID, request.context.groupName, request.body, function(){response.send();});
	return next();
});

server.put('/groups/:groupID/authorizations/:authTag', function (request, response, next) {
	backend.setGroupAuthorization(request.context.groupID, request.context.authTag, request.body, function(){response.send();});
	return next();
});

/**
 * Sends empty response on success
 * Sends a message 
 **/
server.post('/users', function (request, response, next) {
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
	
	return next();
});

server.put('/users/:userID', function (request, response, next) {
	if(request.params.nfcID !== undefined){
		backend.enrollUser(request.params.userID, request.params.nfcID, function(){ response.send(); });
	}else{
		response.send();
	}
	
	// @TODO: update other fields too...
	
	return next();
});

server.get('/groups', function(request, response, next){
	backend.getGroups(function(groups){
		response.send(groups);
	});
	
	return next();
});

/**
 * Plugins
 **/
server.get('/plugins', function (request, response, next) {
	response.send(backend.getPlugins());
	return next();
});

server.put('/plugins/:plugin/enabled', function (request, response, next) {
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
	
	return next();
});

server.get('/plugins/:name/options', function (request, response, next) {
	backend.getOrderedPluginOptions(request.params.name, function(options){
		// sending the plugin name is back because of a weird front-end scoping issue
		// also, options here are ordered, so don't make a dict out of them.
		response.send({
			'plugin': request.params.name,
			'options': options,
		});
	});
	
	return next();
});

server.put('/plugins/:plugin/options/:option', function (request, response, next) {
	backend.setPluginOption(
		request.params.plugin, request.params.option, request.params.value,
		function(){
			response.send();
		},
		function(error){
			response.send(error.detail);
		}
	);
	
	return next();
});

server.post('/plugins/:plugin/actions/:action', function (request, response, next) {
	try{
		backend.getPluginByName(request.params.plugin).actions[request.params.action]();
	}catch(exc){
		console.log(exc);
	}
	
	return next();
});


/**
 * Clients
 **/
server.get('/clients', function(request, response, next) {
	response.send(backend.getClients());
	
	return next();
});

server.post('/clients/:clientID/plugins/:pluginName', function (request, response, next) {
	backend.associateClientPlugin(request.params.clientID, request.params.pluginName, function(){ response.send(); });
	return next();
});

server.post('/clients/:clientID/plugins/:pluginName/actions/:action', function (request, response, next) {
	var client = backend.getClientByID(request.params.clientID);
	var plugin = backend.getPluginByName(request.params.pluginName);
	var action = plugin['clientDetails']['actions'][request.params.action];
	
	action(client, function(){ response.send(); });
	
	return next();
});

server.put('/clients/:clientID/plugins/:pluginName', function (request, response, next) {
	backend.setClientPluginOption(
		request.params.clientID, request.params.pluginName, request.body.option, request.body.value,
		function(){
			response.send();
		},
		function(error){
			response.send(error.detail);
		}
	);

	return next();
});

server.get('/log', function(request, response, next) {
	backend.getLog(request.params.type, function(data){ response.send(data); });	
	return next();
});

/**
 * #############
 * # Stuff
 * #############
 **/

// Serve static files for the web client
server.get('/', function(request, response, next){
	var session = sessionManager.start(request, response);
	var fs = require('fs');	

	if(session.properties['authenticated']){
		fs.readFile('public/index.html', function (err, data) {
			if (err) return next(err);
			response.end(data);
		});
	}else{
		fs.readFile('public/login.html', function (err, data) {
			if (err) return next(err);
			response.end(data);
		});
	}
	next();
});

server.post('/login', function(request, response, next){
	var session = sessionManager.start(request, response);
	var loginOK = function(userID){
		backend.log('Successful login', userID);
		session.properties['authenticated'] = true;
		session.properties['userID'] = userID;
		response.redirect('/', next);
	};
	
	var loginBad = function(){
		backend.log('Failed login: ' + request.params.email + ' / ' + request.params.password)
		session.properties['message'] = 'Login failed';
		response.redirect('/', next);
	};
	
	backend.checkPassword(request.params.email, request.params.password, loginOK, loginBad);	
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

io.sockets.on('connection', function (socket) {
	console.log("CONNECT: " + socket.id);
	
	socket.on('disconnect', function (reason) {
		console.log("DISCONNECT (" + reason + "): " + socket.id);
	});
});

server.listen(3000, function () {
	backend.log(server.name + ' listening at ' + server.url);
});
