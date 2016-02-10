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

var dataBuffer = [];
var lastPackets = {};
var escapeFlag = false;
var packetToValidate;

var responseTimeout;
var retryDelay = 0;

function sendPacket(packet, callback){
	if(serialPort == null || !serialPort.isOpen()){
		// @TODO: figure out auto-reconnect
		backend.error('Failed to send packet - Super Serial not connected');
	}else{
		if(readWriteToggle) readWriteToggle.writeSync(0);
		
		if(packetToValidate){
			backend.error('Packet validation out of order! :(');
		}
		packetToValidate = packet;
		serialPort.write(packet, function(error, results){
			if(error){
				backend.error(error);
			}else{
				console.log("Wrote packet: " + packet.toString());
				if(callback) callback();
				if(readWriteToggle){
					setTimeout(function(){readWriteToggle.writeSync(1);}, 20);
				}
				backend.getPluginOptions(module.exports.name, function(settings){
					if(settings['Timeout']){
						var packetTimeout = function(){
							console.log('packet timeout ' + retries + ' / ' + settings['Max retries']);
							if(settings['Max retries'] == undefined || retries < settings['Max retries']){
								sendPacket(packet);
								retries++;
							}else{
								retries = 0;
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
	console.log("RAW: " + data.toString('hex'));

	for(var i=0; i<data.length; i++){
		var byte = data[i];
		if(byte == messageEndcap && !escapeFlag){
			if(dataBuffer.length > 0){
				clearTimeout(responseTimeout);
				console.log("RECEIVED A FULL PACKET : " + dataBuffer);
				// We have a full packet. Let's process it :)
				packet = {
					'transactionID': dataBuffer[0],
					'from': dataBuffer[1],
					'to': dataBuffer[2],
					'function': dataBuffer[3],
					'data': dataBuffer.slice(5, 5+dataBuffer[4]),
				};
				if(crc.crc16modbus(dataBuffer) == (dataBuffer[5+dataBuffer[4]]<<8) + dataBuffer[6+dataBuffer[4]]){
					if(packetToValidate){
						if(packetToValidate == packet){
							packetToValidate = null;
							retryDelay = 100;
						}else{
							console.log('Packed failed validation');
							console.log('\tReceived: ' + packet);
							console.log('\tExpected: ' + packetToValidate);
							setTimeout(function(){sendPacket(packetToValidate);}, retryDelay * Math.random());
							retryDelay *= 2;
						}
					}else if(packet.function == ACK){
						// ignore the ack
					}else if(packet.function == NAK){
						// resend last packet to this client
						sendPacket(lastPackets[packet.from]);
					}else{
						broadcaster.broadcast(module.exports, 'serial-data-received', packet);
					}
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
							readWriteToggle.writeSync(1);
						}
						try{
							serialPort.on('data', onData);
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
