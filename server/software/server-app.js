var fs = require('fs');
var restify = require('restify');
var backend = require('./backend.js');
var server = restify.createServer({
//	certificate: fs.readFileSync('cert.pem'),
//	key: fs.readFileSync('key.pem'),
	name: 'e-door',
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
	backend.getUsers(request.params.q, request.params.isAdmin, request.params.keyActive, request.params.memberSince, function(users){
		response.send(users);
	});
	
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
