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
var packetToValidate = null;
var validationCallback = null;
var invalidPacketResendTimer = null;
var packetValidationTimer = null;

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
		if(!this.lastPacket) return;
		
		this.waitingForAck = true;
		
		var self = this;
		backend.getPluginOptions(module.exports.name, function(settings){
			var doTimeoutAction = function(){
				if(settings['Timeout']){
					var packetTimeout = function(){
						if(settings['Max retries'] == undefined || self.retries < settings['Max retries']){
							backend.debug('resending');
							if(!self.lastPacket) return;
							_sendPacket(self.lastPacket.packet, doTimeoutAction);
							self.retries++;
							backend.debug('packet timeout ' + self.retries + ' / ' + settings['Max retries']);
						}else{
							self.retries = 0;
							self.waitingForAck = false;
							self.lastPacket = null;
							self.deque();
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

// This packet should already have the endcaps
// @callback isn't called until the packet is validated
function _sendPacket(packet, callback, pauseBeforeRetry){
	if(serialPort == null || !serialPort.isOpen()){
		backend.error('Super Serial not connected. Attempting to reconnect...');
		module.exports.reconnect();
		setTimeout(function(){ _sendPacket(packet, callback, pauseBeforeRetry); }, 100);
	}else{
		if(packetToValidate && packet != packetToValidate){
			backend.debug('Woops! Tried to send a new packet before the last one validated');
			backend.debug(packet);
			backend.debug(packetToValidate);
			if(!pauseBeforeRetry) pauseBeforeRetry = 100;
			// trying to send a message before the last message was verified for errors...
			setTimeout(
				function(){
					_sendPacket(packet, callback, pauseBeforeRetry+100);
				},
				pauseBeforeRetry
			);
			return;
		}
		
		if(readWriteToggle) readWriteToggle.writeSync(0);
		
		validationCallback = callback;
		packetToValidate = packet;
		serialPort.write(packet, function(error, results){			
			if(error){
				backend.error('Packet write error');
				backend.error(error);
			}else{
				var validationFailure = function(){
					backend.error('Packet write fail. Reconnecting super serial...');
					module.exports.reconnect();
				};
				packetValidationTimer = setTimeout(validationFailure, 100);
				backend.debug('Wrote packet   : ' + packet);
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
	var computedCRC = crc.crc16modbus(packet);
	if(computedCRC < 256) packet.push(0);
	packet.push(computedCRC);
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
	backend.debug("RAW Serial     : " + debugData);

	for(var i=0; i<data.length; i++){
		var byte = data[i];
		if(byte == messageEndcap && !escapeFlag){
			dataBuffer.push(byte);
			
			if(dataBuffer.length == 1){
				// do nothing
			}else if(dataBuffer.length == 2 && dataBuffer[0] == messageEndcap && dataBuffer[1] == messageEndcap){
				// if we see two message endCap's in a row, we're probably off by one due to noise/garbage
				dataBuffer.pop();
			}else if(dataBuffer.length > 2){
				var unescapedPacket = [];
				for(var j=0; j<dataBuffer.length; j++){
					if(dataBuffer[j] == escapeChar && !escapeFlag){
						escapeFlag = true;
					}else{
						unescapedPacket.push(dataBuffer[j]);
						escapeFlag = false;
					}
				}

				// We have a full packet. Let's process it :)
				backend.debug('Incoming packet: ' + dataBuffer);
				var packet = {
					'transactionID': unescapedPacket[1],
					'from': unescapedPacket[2],
					'to': unescapedPacket[3],
					'function': unescapedPacket[4],
					'data': unescapedPacket.slice(6, 6+unescapedPacket[5]),
				};
				var computedCRC = crc.crc16modbus(unescapedPacket.slice(1, 6+unescapedPacket[5]));
				var incomingCRC = (unescapedPacket[6+unescapedPacket[5]]<<8) + unescapedPacket[7+unescapedPacket[5]];
				if(computedCRC == incomingCRC){
					if(packetToValidate){
						if(packetToValidate.toString() == dataBuffer.toString()){
							clearTimeout(packetValidationTimer);
							clearTimeout(invalidPacketResendTimer);
							backend.debug('=============================');
							backend.debug('Packet written cleanly');
							backend.debug('=============================');
							// the validation callback is the timer to start listening for an ack
							if(validationCallback) validationCallback();
							
							packetToValidate = null;
							retryDelay = 100;
							// start timeout for ack
						}else{
							backend.debug('=============================');
							backend.debug('Packet did not send correctly. Probable collision occurred');
							backend.debug('Expected: ' + packetToValidate);
							backend.debug('But read: ' + dataBuffer);
							backend.debug('=============================');
							invalidPacketResendTimer = setTimeout(
								function(){
									backend.debug("Resending collision packet");
									_sendPacket(packetToValidate);
								},
								retryDelay + Math.random() * 100
							);
							retryDelay *= 2;
						}
					}else if(packet.function == ACK){
						backend.debug('=============================');
						backend.debug('ACK received for ' + packet.transactionID + ', from ' + packet.from);
						backend.debug('=============================');
						clients[packet.from].ackReceived();
					}else if(packet.function == NAK){
						// resend last packet to this client
						_sendPacket(clients[packet.from].lastPacket.packet);
					}else{
						backend.debug('=============================');
						backend.debug(" Received : " + dataBuffer);
						backend.debug("Unescaped : " + unescapedPacket);
						backend.debug("       ID : " + packet.transactionID);
						backend.debug("     From : " + packet.from);
						backend.debug("       To : " + packet.to);
						backend.debug(" Function : " + packet.function);
						backend.debug("     Data : " + packet.data);
						backend.debug('=============================');
						_sendPacket(buildPacket(packet.from, ACK));
						broadcaster.broadcast(module.exports, 'serial-data-received', packet);
					}
				}else{
					backend.debug('=============================');
					backend.debug("Bad CRC " + incomingCRC + ", computed = " + computedCRC);
					backend.debug(dataBuffer.toString());
					backend.debug('=============================');
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
		if(dataBuffer.length == 1 && dataBuffer[0] != messageEndcap){
			dataBuffer.pop(); // garbage
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
			reset();
			serialPort.close();
			serialPort = null;
			backend.log('Super Serial disconnected');
		}
	},
	
	send: function(clientID, command, payload, callback){
		var client = clients[clientID];
		client.queuePacket(buildPacket(clientID, command, payload), callback);
	},
	
	reconnect: function(){
		backend.debug("Super serial reconnecting");
		module.exports.reset();
		module.exports.onEnable();
	},
	
	reset: function(){
		clearTimeout(invalidPacketResendTimer);
		clearTimeout(packetValidationTimer);

		for(var id in clients){
			clearTimeout(clients[id].responseTimeout);
		}
		
		dataBuffer = [];
		escapeFlag = false;
		packetToValidate = null;
		validationCallback = null;
		invalidPacketResendTimer = null;
		packetValidationTimer = null;

		retryDelay = 0;
	},
};
