var backend = require('../../backend.js');
var broadcaster = require('../../broadcast.js');
var SerialPort = require('serialport');
var GPIO = require('onoff').Gpio;
var crc = require('crc');

var serialPort;
var readWriteToggle;

var dataBuffer = [];
var escapeFlag = false;

var retryDelay = 0;

var SERIAL_FLAGS = {
	'ESCAPE':	0xFE,
	'START':	0xFA,
	'END':		0xFB,
};
var SERIAL_COMMANDS = {
	'UNLOCK':	0x01,
	'LOCK':	 	0x02,
	'KEY':		0x03,
	'TEXT':		0x04,
	'TONE':		0x05,
	'ARM':		0x06,
	'DOOR':		0x07,
	'LIGHTS':	0x08,
	'DENY':		0x0C,
	         
	'ACK':		0xAA,
	'ERROR':	0xFA,
};

function lookupCommand(byte){
	for(var command in SERIAL_COMMANDS){
		if(SERIAL_COMMANDS[command] == byte){
			return command;
		}
	}
}

function lookupSerialFlag(byte){
	for(var flag in SERIAL_FLAGS){
		if(SERIAL_FLAGS[flag] == byte){
			return flag;
		}
	}
}

function SerialClient(clientInfo){
	this.info = clientInfo;
	this.lastPacket = null;
	this.waitingForAck = false;
	this.responseTimeout;
	this.queue = [];
	this.retries = 0;
	this.nextTransactionID = 0;
	
	this.queuePacket = function(packet, callback){
		this.queue.push({
			'packet': packet,
			'callback': callback
		});
		if(!this.waitingForAck){
			this.deque();
		}
	};
	
	this.deque = function(){
		this.lastPacket = this.queue.shift();
		if(!this.lastPacket) return;
		
		this.waitingForAck = true;
		
		var self = this;
		backend.getPluginOptions(module.exports.name, function(settings){
			var timeout = 0+settings['Timeout'];
			var clearTimeoutAction = function(){
				clearTimeout(self.responseTimeout);
			};
			
			var doTimeoutAction = function(){
				var packetTimeout = function(){
					if(settings['Max retries'] == undefined || self.retries < settings['Max retries']){
						backend.debug('resending');
						if(!self.lastPacket) return;
						_sendPacket(self.lastPacket.packet, clearTimeoutAction);
						doTimeoutAction();
						self.retries++;
						backend.debug('packet timeout ' + self.retries + ' / ' + settings['Max retries']);
					}else{
						self.retries = 0;
						self.waitingForAck = false;
						self.lastPacket = null;
						backend.debug('packet timeout but no retries left');
						self.deque();
					}
				};
				self.responseTimeout = setTimeout(packetTimeout, timeout);
			};
			_sendPacket(self.lastPacket.packet, clearTimeoutAction);
			doTimeoutAction();
		});
	};
	
	this.ackReceived = function(){
		clearTimeout(this.responseTimeout);
		this.waitingForAck = false;
		this.lastPacket = null;
		
		if(this.queue.length > 0){
			this.deque();
		}
	};
	
	this.getNextTransactionID = function(resetID){
		if(resetID !== undefined){
			this.nextTransactionID = resetID;
		}
		var idToReturn = this.nextTransactionID;
		
		if(++this.nextTransactionID > 255){
			this.nextTransactionID = 0;
		}

		return idToReturn;
	};
	
	this.hasReceivedPacket = function(packet){
	}

}
var clients = {};

// This packet should already have the endcaps
function _sendPacket(packet, callback, pauseBeforeRetry){
	if(serialPort == null || !serialPort.isOpen()){
		backend.error('Super Serial not connected. Attempting to reconnect...');
		module.exports.reconnect();
		setTimeout(function(){ _sendPacket(packet, callback, pauseBeforeRetry); }, 100);
	}else{
		var doWrite = function(){
			serialPort.write(packet, function(error, results){
				if(error){
					backend.error('Packet write error');
					backend.error(error);
				}
			});
			serialPort.drain(function(error){
				if(error){
					backend.error('Packet write error');
					backend.error(error);
				}else{
					backend.debug('Wrote packet   : ' + packet);
				}
				if(readWriteToggle) setTimeout(function(){readWriteToggle.writeSync(1);}, 10);
				if(callback) callback();
			});
		};
		if(readWriteToggle){
			readWriteToggle.writeSync(0);
			setTimeout(doWrite, 20);
		}else{
			doWrite();
		}
		
	}
}

function sendACK(packet){
	backend.debug('Sending ACK for ' + packet.transactionID + ' to ' + packet.from);
	_sendPacket(buildPacket(packet.from, SERIAL_COMMANDS['ACK'], packet.transactionID));
}

/**
 * If command is an ACK, payload should be the transactionID
 **/
function buildPacket(clientID, command, payload){
	if(!payload){
		payload = [];
	}else if(typeof(payload) === "string"){
		var stringData = payload;
		payload = [];
		for(var i=0; i<stringData.length; i++){
			payload.push(stringData.charCodeAt(i));
		}
	}else if(!(payload instanceof Array)){
		payload = [payload];
	}
	// break up the payload early, so we can correctly calculate its size
	payload = breakupBytes(payload);

	// call nextTransactionID no matter what
	// (received packets increment the ID too, but that's not the ID that's sent
	var transactionID = -1;
	if(command == SERIAL_COMMANDS['ACK']){
		var transactionID = clients[clientID].getNextTransactionID(payload[0]);
		payload = [];
	}else{
		var transactionID = clients[clientID].getNextTransactionID();
	}
	
	var packet = [transactionID, 0, clientID, command, payload.length].concat(payload);
	var computedCRC = crc.crc16modbus(packet);
	if(computedCRC < 256) packet.push(0);
	packet.push(computedCRC);
	packet = [SERIAL_FLAGS['START']].concat(packet).concat([SERIAL_FLAGS['END']]);
	
	// break up multi-bytes. Not sure why it doesn't just work without :(
	packet = breakupBytes(packet);
	
	// add escape characters where necessary
	for(var i=1; i<packet.length-1; i++){
		if(!packet[i]) packet[i] = 0;
		if(lookupSerialFlag(packet[i])){
			packet.splice(i, 0, SERIAL_FLAGS['ESCAPE']);
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
	//backend.debug("RAW Serial     : " + debugData);

	for(var i=0; i<data.length; i++){
		var byte = data[i];
		if(dataBuffer.length == 0 && byte != SERIAL_FLAGS['START']){
			continue; // garbage
		}
		
		if(byte == SERIAL_FLAGS['START'] && !escapeFlag){
			dataBuffer = [];
		}
		
		dataBuffer.push(byte);
		var wasEscaped = escapeFlag;
		if(byte == SERIAL_FLAGS['ESCAPE'] && !escapeFlag){
			escapeFlag = true;
		}else{
			escapeFlag = false;
		}
		
		if(byte == SERIAL_FLAGS['END'] && !wasEscaped){
			var unescapedPacket = [];
			for(var j=0; j<dataBuffer.length; j++){
				if(dataBuffer[j] == SERIAL_FLAGS['ESCAPE'] && !escapeFlag){
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
			if(packet.from != 0){
				var computedCRC = crc.crc16modbus(unescapedPacket.slice(1, 6+unescapedPacket[5]));
				var incomingCRC = (unescapedPacket[6+unescapedPacket[5]]<<8) + unescapedPacket[7+unescapedPacket[5]];
				if(computedCRC == incomingCRC){
					if(packet.function == SERIAL_COMMANDS['ACK']){
						backend.debug('=============================');
						backend.debug('ACK received for ' + packet.transactionID + ', from ' + packet.from);
						backend.debug('=============================');
						if(packet.from != 0) clients[packet.from].ackReceived();
					}else{
						var client = clients[packet.from];
						if(client.hasReceivedPacket(packet)){
							backend.debug('=============================');
							backend.debug('Received duplicate packet: ' + packet.from + '.' + packet.transactionID);
							backend.debug('=============================');
						}else{
							backend.debug('=============================');
							backend.debug(' Received : ' + dataBuffer);
							backend.debug('Unescaped : ' + unescapedPacket);
							backend.debug('       ID : ' + packet.transactionID);
							backend.debug('     From : ' + packet.from);
							backend.debug('       To : ' + packet.to);
							backend.debug(' Function : ' + packet.function);
							backend.debug('     Data : ' + packet.data);
							backend.debug('=============================');
							sendACK(packet);
							broadcaster.broadcast(module.exports, 'serial-data-received', packet);
						}
					}
				}else{
					backend.debug('=============================');
					backend.debug('Bad CRC ' + incomingCRC + ', computed = ' + computedCRC);
					backend.debug(dataBuffer.toString());
					backend.debug('=============================');
				}
			}
			dataBuffer = [];
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
	options: [
		{
			'name': 'Port',
			'type': 'text',
			'value': '/dev/ttyUSB0',
		}, {
			'name': 'Baud',
			'type': 'number',
			'value': 9600,
		}, {
			'name': 'Timeout',
			'type': 'number',
			'value': null,
		}, {
			'name': 'Max retries',
			'type': 'number',
			'value': null,
		}, {
			'name': 'RW Toggle Pin',
			'type': 'number',
			'value': 18,
		},
	],
	
	actions: {},
	onInstall: function(){},
	onUninstall: function(){},
	
	onEnable: function(){
		var settings = backend.regroup(module.exports.options, 'name', 'value');
			if(serialPort){
				module.exports.onDisable();
			}
			serialPort = new SerialPort.SerialPort(
				settings['Port'],
				{ baudrate: settings['Baud'], },
				true,
				function(error){
					if(error){
						backend.error('Serial connection error: ' + error);
					}else{
						backend.log('Super Serial connected!');
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
		
		var knownClients = backend.getClients();
		for(var i=0; i<knownClients.length; i++){
			var c = knownClients[i];
			clients[c.clientID] = new SerialClient(c);
		}
	},
	
	onDisable: function(){
		if(serialPort){
			try{
				module.exports.reset();
			}catch(exc){}
			try{
				serialPort.close();
			}catch(exc){}
			
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
		for(var id in clients){
			clearTimeout(clients[id].responseTimeout);
		}
		
		dataBuffer = [];
		escapeFlag = false;
		retryDelay = 0;
	},
	
	hexStringToByteArray: function(str){
		var result = [];
		while (str.length >= 2) { 
			result.push(parseInt(str.substring(0, 2), 16));
			str = str.substring(2, str.length);
		}

		return result;
	},
	
	byteArrayToHexString: function(data){
		var result = '';
		var z;

		for (var i=0; i<data.length; i++) {
			var str = data[i].toString(16);
			str = Array(2 - str.length + 1).join("0") + str;
			result += str;
		}

		return result;
	},
	
	SERIAL_COMMANDS: SERIAL_COMMANDS,
};
