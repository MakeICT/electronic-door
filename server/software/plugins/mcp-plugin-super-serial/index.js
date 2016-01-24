var broadcaster = require('../../broadcast.js');
var backend = require('../../backend.js');
var SerialPort = require("serialport");

var serialPort;
var transactionCount = 0;

var messageEndcap = 0x7E;

var currentlyPolledClientIndex = -1;

function pollNextClient(){
	var clients = backend.getClients();
	currentlyPolledClientIndex = (currentlyPolledClientIndex + 1) % clients.length;
	module.exports.send(clients[currentlyPolledClientIndex].clientID, 0x0A);
}

module.exports = {
	name: 'Super Serial',
	options: {
		'Port': 'text',
		'Baud': 'number',
		'Data bits': 'number',
		'Stop bits': 'number',
		//'Parity': 'selection list',
		'xon': 'boolean',
		'xoff': 'boolean',
		'xany': 'boolean',
		'flowControl': 'boolean',
		'bufferSize': 'number',
	},
	
	actions: {},
	onInstall: function(){},
	onUninstall: function(){},
	
	onEnable: function(){
		var onData = function(data){
			if(data == '') return;
			
			console.log('Serial received: ' + data);
			packet = {
				'transactionID': data[0],
				'from': data[1],
				'to': data[2],
				'function': data[3],
				'data': data.slice(5, data[4]),
			};
			// @TODO: if CRC matches, send ACK back
			broadcaster.broadcast(module.exports, 'serial-data-received', packet);
			pollNextClient();
		};
		
		var onConnected = function(error){
			if(error){
				console.log(error);
			}else{
				console.log('Serial connected!');
				serialPort.on('data', onData);
				pollNextClient();
			}
		};
		
		backend.getPluginOptions(module.exports.name, function(settings){
			serialPort = new SerialPort.SerialPort(
				settings['Port'],
				{
					baudrate: settings['Baud'],
					parser: SerialPort.parsers.readline(messageEndcap),
				},
				true,
				onConnected
			);
		});
	},
	
	onDisable: function(){
		serialPort.destroy();
	},
	
	send: function(clientID, command, payload, callback){
		if(serialPort == null || !serialPort.isOpen()){
			// @TODO: figure out auto-reconnect
			console.error('Not connected');
		}else{
			if(!payload){
				payload = [];
			}else if(!(payload instanceof Array)){
				payload = [payload];
			}
			for(var i=0; i<payload.length; i++){
				if(!payload[i]) payload[i] = 0;
				if(payload[i] == 0x7D || payload[i] == messageEndcap){
					payload.splice(i, 0, 0x7D);
					i++;
				}
			}
			var header = [messageEndcap, transactionCount++, 0x0, clientID, command, payload.length];
			var footer = [0xFF, 0xFF, messageEndcap];
			var packet = header.concat(payload).concat(footer);
			
			serialPort.write(packet, function(error, results){
				if(error){
					console.log("ERROR: " + error);
				}else{
					console.log("Serial sent: " + packet);
					if(callback) callback();
				}
			});
		}
	}
};
