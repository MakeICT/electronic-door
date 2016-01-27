var broadcaster = require('../../broadcast.js');
var backend = require('../../backend.js');
var SerialPort = require("serialport");
var GPIO = require('onoff').Gpio;

var serialPort;
var transactionCount = 0;

var escapeChar = 0x7D;
var messageEndcap = 0x7E;

var readWriteToggle;

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
			if(dataBuffer.length > 0){
				packet = {
					'transactionID': dataBuffer[0],
					'from': dataBuffer[1],
					'to': dataBuffer[2],
					'function': dataBuffer[3],
					'data': "",
				};
				for(var j=5; j<5+dataBuffer[4]; j++){
					packet.data += dataBuffer[j].toString(16);
				}
				// @TODO: if CRC matches, send ACK back
				broadcaster.broadcast(module.exports, 'serial-data-received', packet);
				dataBuffer = [];
				pollNextClient();
			}
		}else if(byte == escapeChar && !escapeFlag){
			escapeFlag = true;
		}else{
			escapeFlag = false;
			dataBuffer.push(byte);
		}
	}
};

function breakupBytes(byteArray){
	var output = [];
	for(var i=0; i<byteArray.length; i++){
		var byte = byteArray[i];
		while(byte > 0xFF){
			output.push((byte >> 8) & 0xFF);
			byte = (byte & 0xFF);
		}
		output.push(byte);
	}
	
	return output;
}

module.exports = {
	name: 'Super Serial',
	options: {
		'Port': 'text',
		'Baud': 'number',
		'R/W Toggle Pin': 'number',
		//'Data bits': 'number',
		//'Stop bits': 'number',
		//'Parity': 'selection list',
		//'xon': 'boolean',
		//'xoff': 'boolean',
		//'xany': 'boolean',
		//'flowControl': 'boolean',
		//'bufferSize': 'number',
	},
	
	actions: {},
	onInstall: function(){},
	onUninstall: function(){},
	
	onEnable: function(){		
		backend.getPluginOptions(module.exports.name, function(settings){
			serialPort = new SerialPort.SerialPort(
				settings['Port'],
				{
					baudrate: settings['Baud'],
				},
				true,
				function(error){
					if(error){
						backend.error(error);
					}else{
						backend.log('Serial connected!');
						if(settings['R/W Toggle Pin']){
							readWriteToggle = new GPIO(settings['R/W Toggle Pin'], 'out');
						}
						serialPort.on('data', onData);
						setTimeout(pollNextClient, 3000);
					}
				}
			);
		});
	},
	
	onDisable: function(){
		if(serialPort){
			serialPort.close();
			serialPort = null;
			backend.log('Serial disconnected!');
		}
	},
	
	send: function(clientID, command, payload, callback){
		if(serialPort == null || !serialPort.isOpen()){
			// @TODO: figure out auto-reconnect
			console.error('Not connected');
		}else{
			if(readWriteToggle) readWriteToggle.writeSync(0);

			if(!payload){
				payload = [];
			}else if(!(payload instanceof Array)){
				payload = [payload];
			}
			payload = breakupBytes(payload);
			
			var header = [messageEndcap, transactionCount++, 0x0, clientID, command, payload.length];
			var footer = [0xFFFF, messageEndcap];
			var packet = breakupBytes(header.concat(payload).concat(footer));
			
			for(var i=1; i<packet.length-1; i++){
				if(!packet[i]) packet[i] = 0;
				if(packet[i] == 0x7D || packet[i] == messageEndcap){
					packet.splice(i, 0, 0x7D);
					i++;
				}
			}
			serialPort.write(packet, function(error, results){
				if(readWriteToggle) readWriteToggle.writeSync(1);
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
