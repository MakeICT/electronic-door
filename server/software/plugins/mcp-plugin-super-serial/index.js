var broadcaster = require('../../broadcast.js');
var backend = require('../../backend.js');
var SerialPort = require("serialport");

var serialPort;
var transactionCount = 0;

var escapeChar = 0x7D;
var messageEndcap = 0x7E;

var currentlyPolledClientIndex = -1;

var dataBuffer = [];
function pollNextClient(){
	var clients = backend.getClients();
	currentlyPolledClientIndex = (currentlyPolledClientIndex + 1) % clients.length;
	module.exports.send(clients[currentlyPolledClientIndex].clientID, 0x0A);
}

var escapeFlag = false;
function onData(data){
	console.log(JSON.stringify(data));
	for(var i=0; i<data.length; i++){
		var byte = data[i];
		if(byte == messageEndcap && !escapeFlag){
			console.log("Endcap");
			if(dataBuffer.length > 0){
				packet = {
					'transactionID': dataBuffer[0],
					'from': dataBuffer[1],
					'to': dataBuffer[2],
					'function': dataBuffer[3],
					'data': "",
				};
				console.log("DataBuffer = " + dataBuffer);
				for(var j=5; j<5+dataBuffer[4]; j++){
					packet.data += dataBuffer[j].toString(16);
				}
				// @TODO: if CRC matches, send ACK back
				broadcaster.broadcast(module.exports, 'serial-data-received', packet);
				dataBuffer = [];
				pollNextClient();
			}
		}else if(byte == escapeChar && !escapeFlag){
			console.log("Escape enabled");
			escapeFlag = true;
		}else{
			if(escapeFlag) console.log("Escape cleared");
			escapeFlag = false;
			console.log("Push " + byte);
			dataBuffer.push(byte);
		}
	}
};

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
		var onConnected = function(error){
			if(error){
				console.log(error);
			}else{
				console.log('Serial connected!');
				serialPort.on('data', onData);
				setTimeout(pollNextClient, 3000);
			}
		};
		
		backend.getPluginOptions(module.exports.name, function(settings){
			serialPort = new SerialPort.SerialPort(
				settings['Port'],
				{
					baudrate: settings['Baud'],
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
			var header = [messageEndcap, transactionCount++, 0x0, clientID, command, payload.length];
			var footer = [0xFF, 0xFF, messageEndcap];
			var packet = header.concat(payload).concat(footer);
			
			for(var i=1; i<packet.length-1; i++){
				if(!packet[i]) packet[i] = 0;
				if(packet[i] == 0x7D || packet[i] == messageEndcap){
					packet.splice(i, 0, 0x7D);
					i++;
				}
			}
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
