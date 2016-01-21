var backend = require('../../backend.js');
var SerialPort = require("serialport").SerialPort;

var serialPort;
var transactionCount = 0;

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
	
	actions: {
	},
	
	onInstall: function(){
	},

	onUninstall: function(){
		
	},
	
	onEnable: function(){
		var onData = function(data){
			console.log('data received: ' + data);
			packet = {
				'transactionID': data[0],
				'from': data[1],
				'to': data[2],
				'function': data[3],
				'data': data.slide(5, data[4]),
			};
			// @TODO: if CRC matches, send ACK back
			broadcaster.broadcast(module.exports, 'serial-data-received', packet);
		};
		
		var onConnected = function(error){
			if(error){
				console.log(error);
			}else{
				console.log('Serial connected!');
				serialPort.on('data', onData);
				if(callback) callback();
			}
		};
		
		backend.getPluginOptions(module.exports.name, function(settings){
			serialPort = new SerialPort(
				settings['Port'],
				{
					baudrate: settings['Baud'],
					parser: SerialPort.parers.readline(0x7E),
				},
				true,
				onConnected
			);
		});
	},
	
	onDisable: function(){
		console.log('Disabled');
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
				if(payload[i] == 0x7D || payload[i] == 0x7E){
					payload.splice(i, 0, 0x7D);
					i++;
				}
			}
//			var header = [0x7E, 7 + payload.length, transactionCount++, 0x0, clientID, command];
			var header = [0x7E, 5 + payload.length, 0x0, clientID, command];
			var footer = [0xFFFF, 0x7E];
			var packet = header.concat(payload).concat(footer);
			
			console.log("Packet = " + packet);
			
			serialPort.write(packet, function(error, results){
				if(error){
					console.log("ERROR: " + error);
				}else{
					console.log(results);
					if(callback) callback();
				}
			});
		}
	}
};
