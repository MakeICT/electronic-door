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
var escapeFlag = false;
var packetToValidate;
var validationCallback;

var retryDelay = 0;

function SerialClient(clientInfo){
	this.info = clientInfo;
	this.lastPacket = null;
	this.waitingForAck = false;
	this.responseTimeout;
	this.queue = [];
	this.retries = 0;
	
	this.queuePacket = function(packet, callback){
		this.queue.push({
			'packet': packet,
			'callback': callback
		});
		if(!this.waitingForAck){
			this.deque();
		}
	};
	
	this.ackReceived = function(){
		//backend.debug('ACK received for client(' + this.info.clientID + ') transaction(' + this.lastPacket.packet[1] + ') action(' + this.lastPacket.packet[4] + ')');
		clearTimeout(this.responseTimeout);
		this.waitingForAck = false;
		this.lastPacket = null;
		
		if(this.queue.length > 0){
			this.deque();
		}
	};
	
	this.deque = function(){
		this.lastPacket = this.queue.shift();
		this.waitingForAck = true;
		
		var self = this;
		backend.getPluginOptions(module.exports.name, function(settings){
			var doTimeoutAction = function(){
				if(settings['Timeout']){
					var packetTimeout = function(){
						if(settings['Max retries'] == undefined || self.retries < settings['Max retries']){
							backend.debug('resending');
							_sendPacket(self.lastPacket.packet, doTimeoutAction);
							self.retries++;
							backend.debug('packet timeout ' + self.retries + ' / ' + settings['Max retries']);
						}else{
							self.retries = 0;
							backend.debug('packet timeout but no retries left');
						}
					};
					self.responseTimeout = setTimeout(packetTimeout, settings['Timeout']);
				}
			};
			
			_sendPacket(self.lastPacket.packet, doTimeoutAction);
		});
	};
}
var clients = {};

function _sendPacket(packet, callback, pauseBeforeRetry){
	if(serialPort == null || !serialPort.isOpen()){
		// @TODO: figure out auto-reconnect
		backend.error('Failed to send packet - Super Serial not connected');
	}else{
		if(packetToValidate){
			backend.debug('Woops! Tried to send a new packet before the last one validated');
			if(!pauseBeforeRetry) pauseBeforeRetry = 100;
			// trying to send a message before the last message was verified for errors...
			setTimeout(pauseBeforeRetry, function(){ _sendPacket(packet, callback, pauseBeforeRetry+100) });
			return;
		}
		
		if(readWriteToggle) readWriteToggle.writeSync(0);
		
		validationCallback = callback;
		packetToValidate = packet.slice(1, packet.length-1);
		serialPort.write(packet, function(error, results){			
			if(error){
				backend.error('Packet write error');
				backend.error(error);
			}else{
				backend.debug('Wrote packet: ' + packet);
				if(readWriteToggle){
					setTimeout(function(){readWriteToggle.writeSync(1);}, 20);
				}
			}
		});
	}
}

function buildPacket(clientID, command, payload){
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

	return packet;
}

function onData(data){
	var debugData = [];
	for(var i=0; i<data.length; i++){
		debugData.push(Number(data[i]));
	}
	backend.debug("RAW Serial  : " + debugData);

	for(var i=0; i<data.length; i++){
		var byte = data[i];
		if(byte == messageEndcap && !escapeFlag){
			if(dataBuffer.length > 0){
				var unescapedPacket = [];
				for(var i=0; i<dataBuffer.length; i++){
					if(dataBuffer[i] == escapeChar && !escapeFlag){
						escapeFlag = true;
					}else{
						unescapedPacket.push(dataBuffer[i]);
						escapeFlag = false;
					}
				}

				// We have a full packet. Let's process it :)
				packet = {
					'transactionID': unescapedPacket[0],
					'from': unescapedPacket[1],
					'to': unescapedPacket[2],
					'function': unescapedPacket[3],
					'data': unescapedPacket.slice(5, 5+unescapedPacket[4]),
				};
				var computedCRC = crc.crc16modbus(unescapedPacket.slice(0, 5+unescapedPacket[4]));
				var incomingCRC = (unescapedPacket[5+unescapedPacket[4]]<<8) + unescapedPacket[6+unescapedPacket[4]];
				if(computedCRC == incomingCRC){
					if(packetToValidate){
						if(packetToValidate.toString() == dataBuffer.toString()){
							if(validationCallback) validationCallback();
							
							packetToValidate = null;
							retryDelay = 100;
							backend.debug('Sent packet validated');
						}else{
							backend.debug('Packet failed validation');
							backend.debug('Received: ');
							backend.debug(dataBuffer);
							backend.debug('Expected: ');
							backend.debug(packetToValidate);
							setTimeout(function(){sendPacket(packetToValidate);}, retryDelay * Math.random());
							retryDelay *= 2;
						}
					}else if(packet.function == ACK){
						clients[packet.from].ackReceived();
					}else if(packet.function == NAK){
						// resend last packet to this client
						sendPacket(clients[packet.from].lastPacket);
					}else{
						_sendPacket(buildPacket(packet.from, ACK));
						backend.debug("RECEIVED A FULL PACKET : " + dataBuffer);
						backend.debug("             Unescaped : " + unescapedPacket);
						broadcaster.broadcast(module.exports, 'serial-data-received', packet);
					}
				}else{
					backend.debug("Bad CRC");
					backend.debug("\tComputed = " + computedCRC);
					backend.debug("\tReceived = " + incomingCRC);
					backend.debug("\tByte 1   = " + unescapedPacket[5+unescapedPacket[4]]);
					backend.debug("\tByte 2   = " + unescapedPacket[6+unescapedPacket[4]]);
				}
				dataBuffer = [];
			}
		}else if(byte == escapeChar && !escapeFlag){
			escapeFlag = true;
			dataBuffer.push(byte);
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
						backend.error('Serial connection error');
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
		
		var knownClients = backend.getClients();
		for(var i=0; i<knownClients.length; i++){
			var c = knownClients[i];
			clients[c.clientID] = new SerialClient(c);
		}
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
		var client = clients[clientID];
		client.queuePacket(buildPacket(clientID, command, payload), callback);
	}
};
