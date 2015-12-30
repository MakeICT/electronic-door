var restify = require('restify');
var backend = require('./backend.js');

var plugins = {};
var clients = {};
var doneLoading = false;


var server = restify.createServer({
//	certificate: fs.readFileSync('cert.pem'),
//	key: fs.readFileSync('key.pem'),
	name: 'master-control-program',
});
var io = require('socket.io').listen(server.server);

//var backend = require('./backend.js');
//var sequelize = backend.buildSchema();

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

/**
 * Plugins
 **/
server.get('/plugins', function (request, response, next) {
	response.send(plugins);
	return next();
});

server.put('/plugins/:plugin/enabled', function (request, response, next) {
	var task = request.params.value ? backend.enablePlugin : backend.disablePlugin;
	var plugin = plugins[request.params.plugin];
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
	plugins[request.params.plugin].actions[request.params.action]();
	
	return next();
});


/**
 * Clients
 **/
server.get('/clients', function (request, response, next) {
	response.send(clients);
	
	return next();
});

server.post('/clients/:clientID/plugins/:pluginName', function (request, response, next) {
	// @TODO: change this to plugin name instead of plugin ID and /clients/:clientID/plugins/:pluginName
	var pluginID = plugins[request.params.pluginName].pluginID;
	var addOptionsAndActions = function(){
		loadClients(function(){
			response.send();
		});
	};
	backend.associateClientPlugin(request.params.clientID, pluginID, addOptionsAndActions);	
	return next();
});

server.post('/clients/:clientID/plugins/:pluginName/actions/:action', function (request, response, next) {
	var client = clients[request.params.clientID];
	var plugin = plugins[request.params.pluginName];
	var action = plugin['clientDetails']['actions'][request.params.action];
	
	action(client, function(){ response.send(); });
	
	return next();
});


/*
server.put('/clients/:clientID/plugins/:pluginName/options/:option/:value', function (request, response, next) {
	// @TODO: make this work
	backend.setClientPluginOption(
		request.params.client, request.params.pluginName, request.params.option, request.params.value,
		function(){
			response.send();
		},
		function(error){
			response.send(error.detail);
		}
	);
	return next();
});
*/




/**
 * #############
 * # Stuff
 * #############
 **/
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



function loadClients(callback){
	backend.getClients(function(clientList){
		for(var i=0; i<clientList.length; i++){
			var client = clientList[i];
			
			clients[client.clientID] = client;
			
			for(var pluginName in client.plugins){
				client.plugins[pluginName].actions = Object.keys(plugins[pluginName].clientDetails.actions);
			}
			callback();
		}
	});
}

function loadData(){
	// Load plugins
	var fs = require('fs');
	var path = require('path');
	var pluginFolders = fs.readdirSync('./plugins').filter(function(file) {
		return fs.statSync(path.join('./plugins', file)).isDirectory();
	});
	backend.getPlugins(function(pluginList){
		for(var i=0; i<pluginFolders.length; i++){
			var plugin = require('./plugins/' + pluginFolders[i] + '/index.js');
			plugin.actionNames = Object.keys(plugin.actions);
			var found = false;
			for(var j=0; j<pluginList.length; j++){
				if(pluginList[j].name == plugin.name){
					plugin.pluginID = pluginList[j].pluginID;
					found = true;
					break;
				}
			}
			if(!found){
				var onRegistered = function(plugin){
					console.log('Plugin registered: ' + plugin.name);
					plugin.onInstall();
				};
				if(plugin.clientDetails){
					backend.registerClientPlugin(plugin, onRegistered);
				}else{
					backend.registerPlugin(plugin, onRegistered);
				}
			}
			plugins[plugin.name] = plugin;
		}
		
	// Load clients
		loadClients(startServer);
	});
}


function startServer(){
	server.listen(3000, function () {
		console.log('%s listening at %s', server.name, server.url);
	});
}

loadData();
