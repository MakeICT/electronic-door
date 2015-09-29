var fs = require('fs');

var restify = require('restify');
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
	var query = request.params.q;
	response.send([
		{
			"firstName": "Bob",
			"lastName": "Jackson",
			"email": "bobjackson@makeict.org",
			"memberSince": "2015-01-01",
			"status": "active",
			"keyStatus": "active",
			"isAdmin": false,
		},{
			"firstName": "Dominic",
			"lastName": "Canare",
			"email": "dom@makeict.org",
			"memberSince": "2012-01-01",
			"status": "active",
			"keyStatus": "active",
			"isAdmin": true,
		},{
			"firstName": "Matt",
			"lastName": "Pogue",
			"email": "mpogue@makeict.org",
			"memberSince": "2014-01-01",
			"status": "active",
			"keyStatus": "active",
			"isAdmin": true,
		},{
			"firstName": "Mike",
			"lastName": "Barushok",
			"email": "barushok@makeict.org",
			"memberSince": "2014-04-01",
			"status": "inactive",
			"keyStatus": "inactive",
			"isAdmin": false,
		}
	]);
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
