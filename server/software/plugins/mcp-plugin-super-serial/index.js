var broadcaster = require('../../broadcast.js');
var backend = require('../../backend.js');
var SerialPort = require('serialport');
var GPIO = require('onoff').Gpio;
var crc = require('crc');

var serialPort;
var transactionCount = 0;

var escapeChar = 0x7D;
var messageEndcap = 0x7E;
var ACK = 0xAA;
var NAK = 0xAB;

var readWriteToggle;

var currentlyPolledClientIndex = -1;

var dataBuffer = [];
var lastPackets = {};
var escapeFlag = false;

var responseTimeout;
var retries = 0;

function reallyShittyDelay(ms){
	// I'm so embarrased :(
	var now = function() { return (new Date).getTime(); };
	var startTime = now();
	while(now()-startTime < ms);
}

function pollNextClient(){
	reallyShittyDelay(500);
	var clients = backend.getClients();
	currentlyPolledClientIndex = (currentlyPolledClientIndex + 1) % clients.length;
	module.exports.send(clients[currentlyPolledClientIndex].clientID, 0x0A);
}

function sendPacket(packet, callback){
	if(serialPort == null || !serialPort.isOpen()){
		// @TODO: figure out auto-reconnect
		backend.error('Failed to send packet - Super Serial not connected');
	}else{
		backend.debug("attempting to send packet");
		readWriteToggle.writeSync(0);
		//reallyShittyDelay(20);
		serialPort.write(packet, function(error, results){
			if(error){
				backend.error(error);
			}else{
				backend.debug("Wrote packet: " + packet.toString());
				if(callback) callback();
				if(readWriteToggle){
					backend.debug('flipping to read mode...');
					reallyShittyDelay(20);
					readWriteToggle.writeSync(1);
					backend.debug('flipped');
				}
				backend.getPluginOptions(module.exports.name, function(settings){
					if(settings['Timeout']){
						var packetTimeout = function(){
							backend.debug('packet timeout ' + retries + ' / ' + settings['Max retries']);
							if(settings['Max retries'] == undefined || retries < settings['Max retries']){
								sendPacket(packet);
								retries++;
							}else{
								retries = 0;
								pollNextClient();
							}
						};
						responseTimeout = setTimeout(packetTimeout, settings['Timeout']);
					}
				});
			}
		});
	}
}


function onData(data){
	backend.debug("RAW: " + data.toString());
	clearTimeout(responseTimeout);

	for(var i=0; i<data.length; i++){
		var byte = data[i];
		if(byte == messageEndcap && !escapeFlag){
			if(dataBuffer.length > 0){
				backend.debug("RECEIVED A FULL PACKET : " + dataBuffer);
				// We have a full packet. Let's process it :)
				packet = {
					'transactionID': dataBuffer[0],
					'from': dataBuffer[1],
					'to': dataBuffer[2],
					'function': dataBuffer[3],
					'data': dataBuffer.slice(5, 5+dataBuffer[4]),
				};				
				if(crc.crc16modbus(dataBuffer) == (dataBuffer[5+dataBuffer[4]]<<8) + dataBuffer[6+dataBuffer[4]]){
					if(packet.function == ACK){
						// ignore the ack
					}else if(packet.function == NAK){
						// resend last packet to this client
						sendPacket(lastPackets[packet.from]);
					}else{
						broadcaster.broadcast(module.exports, 'serial-data-received', packet);
//						module.exports.send(packet.from, ACK, [], pollNextClient());
						pollNextClient();
					}
				}else{
//					module.exports.send(packet.from, NAK, [], pollNextClient());
					pollNextClient();
				}
				dataBuffer = [];
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
		'Timeout': 'number',
		'Max retries': 'number',
		'RW Toggle Pin': 'number',
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
				{ baudrate: settings['Baud'], },
				true,
				function(error){
					if(error){
						backend.error(error);
					}else{
						backend.log('Super Serial connected');
						if(settings['RW Toggle Pin']){
							readWriteToggle = new GPIO(settings['RW Toggle Pin'], 'out');
						}
						try{
							serialPort.on('data', onData);
							setTimeout(pollNextClient, 1000);
						}catch(exc){
							backend.error(exc);
						}
					}
				}
			);
		});
	},
	
	onDisable: function(){
		if(serialPort){
			clearTimeout(responseTimeout);
			serialPort.close();
			serialPort = null;
			backend.log('Super Serial disconnected');
		}
	},
	
	send: function(clientID, command, payload, callback){
		if(!payload){
			payload = [];
		}else if(!(payload instanceof Array)){
			payload = [payload];
		}
		// break up the payload early, so we can correctly calculate its size
		payload = breakupBytes(payload);
		
		// assemble the packet
		if(++transactionCount > 255) transactionCount = 0;
		var packet = [transactionCount, 0, clientID, command, payload.length].concat(payload);
		packet.push(crc.crc16modbus(packet));
		packet = [messageEndcap].concat(packet).concat([messageEndcap]);
		
		// break up multi-bytes. Not sure why it doesn't just work without :(
		packet = breakupBytes(packet);
		
		// add escape characters where necessary
		for(var i=1; i<packet.length-1; i++){
			if(!packet[i]) packet[i] = 0;
			if(packet[i] == 0x7D || packet[i] == messageEndcap){
				packet.splice(i, 0, 0x7D);
				i++;
			}
		}

		lastPackets[clientID] = packet;
		
		sendPacket(packet, callback);
	}
};
