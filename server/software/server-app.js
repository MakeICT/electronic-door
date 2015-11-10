var restify = require('restify');
var backend = require('./backend.js');

// Load plugins
var fs = require('fs');
var path = require('path');
var pluginFolders = fs.readdirSync('./plugins').filter(function(file) {
	return fs.statSync(path.join('./plugins', file)).isDirectory();
});
var plugins = {};
backend.getPlugins(function(pluginList){
	for(var i=0; i<pluginFolders.length; i++){
		var plugin = require('./plugins/' + pluginFolders[i] + '/index.js');
		var found = false;
		for(var j=0; j<pluginList.length; j++){
			if(pluginList[j].name == pluginFolders[i]){
				found = true;
				break;
			}
		}
		if(!found){
			backend.registerPlugin(plugin, plugin.onInstall);
		}
		plugins[plugin.name] = plugin;
	}
});



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


server.get('/plugins', function (request, response, next) {
	backend.getPlugins(function(pluginsInDB){
		for(var i=0; i<pluginsInDB.length; i++){
			pluginsInDB[i].actions = Object.keys(plugins[pluginsInDB[i].name].actions);
		}
		response.send(pluginsInDB);
	});
	
	return next();
});

server.put('/plugins/:plugin/enabled', function (request, response, next) {
	var task = request.params.value ? backend.enablePlugin : backend.disablePlugin;
	task(
		request.params.plugin,
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
	backend.getPluginOptions(request.params.name, function(options){
		response.send(
			{
				'plugin': request.params.name,
				'options': options,
			}
		);
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

server.listen(3000, function () {
	console.log('%s listening at %s', server.name, server.url);
});
