var backend = require('../../backend.js');
var broadcaster = require('../../broadcast.js');
var SerialPort = require('serialport');
var GPIO = require('onoff').Gpio;
var crc = require('crc');

var serialPort;
var readWriteToggle;

var dataBuffer = [];
var escapeFlag = false;

var connectionResetter = {
	'timer': null,
	'trigger': false,
	'start': function(){
		connectionResetter.stop();
		connectionResetter.trigger = false;
		connectionResetter.timer = setInterval(connectionResetter.loop, 2000);
	},
	'stop': function(){
		clearInterval(connectionResetter.timer);
	},
	'loop': function(){
		if(connectionResetter.trigger){
			connectionResetter.onTrigger();
		}
	},
	'onTrigger': function(){
		module.exports.reconnect();
	},
};

var watchdog = {
	'timer': null,
	'stop': function(){
		clearTimeout(watchdog.timer);
	},
	'reset': function(){
		clearTimeout(watchdog.timer);
		watchdog.timer = setTimeout(watchdog.onTrigger, 60000);
	},
	'onTrigger': function(){
		backend.debug('Super serial watchdog activated');
		connectionResetter.trigger = true;
	},
};

var SERIAL_FLAGS = {
	'ESCAPE':	0xFE,
	'START':	0xFA,
	'END':		0xFB,
};
var SERIAL_COMMANDS = {
	'ADDRESS':	0x00,
	'UNLOCK':	0x01,
	'LOCK':	 	0x02,
	'KEY':		0x03,
	'TEXT':		0x04,
	'TONE':		0x05,
	'ARM':		0x06,
	'DOOR':		0x07,
	'LIGHTS':	0x08,
  'DOORBELL': 0x09,
	'DENY':		0x0C,
  'DOORBELL_PRESSED': 0x0D,
	         
	'ACK':		0xAA,
	'ERROR':	0xFA,
};

function getSettings(){
	try{
		return backend.regroup(module.exports.options, 'name', 'value');
	}catch(exc){
		backend.error('Failed to get plugin settings for ' + module.exports.name);
		backend.error(exc);
	}
}

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

function reloadClients(callback){
	var knownClients = backend.getClients();
	for(var i=0; i<knownClients.length; i++){
		var c = knownClients[i];
		if(!clients[c.clientID]){
			clients[c.clientID] = new SerialClient(c);
		}
	}
}

function Packet(rawBytesOrTransactionID, from, to, command, payload){
	this.bytes = [];
	this.unescapedPacket = [];
	if(from === undefined){
		if(typeof(rawBytesOrTransactionID) === "string"){
			var bytes = module.exports.stringToByteArray(rawBytesOrTransactionID);
		}else{
			var bytes = rawBytesOrTransactionID;
		}
		for(var j=0; j<bytes.length; j++){
			if(bytes[j] == SERIAL_FLAGS['ESCAPE'] && !escapeFlag){
				escapeFlag = true;
			}else{
				this.unescapedPacket.push(bytes[j]);
				escapeFlag = false;
			}
		}
		this.transactionID = this.unescapedPacket[1];
		this.from = this.unescapedPacket[2];
		this.to = this.unescapedPacket[3];
		this.command = this.unescapedPacket[4];
		this.payload = this.unescapedPacket.slice(6, 6+this.unescapedPacket[5]);
	}else{
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
		this.transactionID = rawBytesOrTransactionID;
		this.from = from;
		this.to = to;
		this.command = command;
		this.payload = breakupBytes(payload);
		
		this.bytes = [this.transactionID, this.from, this.to, this.command, this.payload.length].concat(this.payload);
		var computedCRC = crc.crc16modbus(this.bytes);
		if(computedCRC < 256) this.bytes.push(0);
		this.bytes.push(computedCRC);
		this.bytes = [SERIAL_FLAGS['START']].concat(this.bytes).concat([SERIAL_FLAGS['END']]);
		
		// break up multi-bytes. Not sure why it doesn't just work without :(
		this.bytes = breakupBytes(this.bytes);
		// add escape characters where necessary
		for(var i=1; i<this.bytes.length-1; i++){
			if(!this.bytes[i]) this.bytes[i] = 0;
			if(lookupSerialFlag(this.bytes[i])){
				this.bytes.splice(i, 0, SERIAL_FLAGS['ESCAPE']);
				i++;
			}
		}
	}
	
	this.checkCRC = function(){
		var computedCRC = crc.crc16modbus(this.unescapedPacket.slice(1, 6+this.unescapedPacket[5]));
		var incomingCRC = (this.unescapedPacket[6+this.unescapedPacket[5]]<<8) + this.unescapedPacket[7+this.unescapedPacket[5]];
		if(computedCRC == incomingCRC){
			return true;
		}else{
			backend.debug('=============================');
			backend.debug('Bad CRC ' + computedCRC + ' vs ' + incomingCRC);
			backend.debug('=============================');
			return false;
		}
	};
	
	this.toString = function(){
		return module.exports.byteArrayToHexString(this.bytes);
	};
}

var packetQueue = {
	'_queue': [],
	'waitingForACK': false,
	'retries': 0,
	'lastPacketInfo': null,
	'ackTimeout': null,
	
	'queue': function(packetDetails, client){
		this._queue.push(packetDetails);
		if(!this.waitingForACK){
			this.dequeue();
		}
	},
	
	'dequeue': function(){
		if(this.waitingForACK){
			backend.error('Super Serial CANNOT DEQUEUE RIGHT NOW!');
			return;
		}
		this.lastPacketInfo = this._queue.shift();
		if(!this.lastPacketInfo) return;
		
		this.waitingForACK = true;		
		this._doSend();
	},
	
	'onACKTimeout': function(){
		if(!this.lastPacketInfo){
			// dequeue() happened before ACK was received and before this function was called
			return;
		}
		var settings = getSettings();
		var maxRetries = parseInt(settings['Max retries']);
		
		if(++this.retries > maxRetries){
			backend.debug('Packet failed after ' + maxRetries + ' retries: ' + this.lastPacketInfo.toString());
			this._doneWaiting();
		}else{
			try{
				backend.debug('Resending packet (' + this.retries + '/' + maxRetries + '): ' + this.lastPacketInfo.toString());
				this._doSend();
			}catch(exc){
				backend.error('Error while attempting to resend packet: ' + exc);
				backend.error(exc);
			}
		}
	},
	
	'onACKReceived': function(packet){
		if(this.lastPacketInfo && packet.from == this.lastPacketInfo.to && packet.transactionID == this.lastPacketInfo.transactionID){
			this._doneWaiting();
		}
	},
	
	'clear': function(){
		this._queue = [];
		this._doneWaiting();
	},
	
	'_doSend': function(){
		var settings = getSettings();
		
		if(this.lastPacketInfo.to == 255){
			var timeoutPeriod = 0;
			var maxRetries = 0;
		}else{
			var timeoutPeriod = parseInt(settings['Timeout']);
			var maxRetries = parseInt(settings['Max retries']);
		}
		
		var afterWriteComplete;
		if(timeoutPeriod > 0 && maxRetries > 0 && this.lastPacketInfo.command != SERIAL_COMMANDS['ACK']){
			 // don't allow dequeue until ack is received (or we give up)
			afterWriteComplete = function(){
				this.ackTimeout = setTimeout(this.onACKTimeout.bind(this), timeoutPeriod);
			};
		}else{
			 // don't allow dequeue until we're done writing this packet out
			afterWriteComplete = this._doneWaiting;
		}
		_sendPacket(this.lastPacketInfo.bytes, afterWriteComplete.bind(this));
	},
	
	'_doneWaiting': function(){
		clearTimeout(this.ackTimeout);
		this.retries = 0;
		this.waitingForACK = false;
		this.dequeue();
	},
};

function SerialClient(clientInfo){
	this.info = clientInfo;
	this.nextTransactionID = 0;
	
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
		return packet.transactionID < this.nextTransactionID;
	}

}
var clients = {};

// This is the lowest-level packet-writing function
function _sendPacket(packet, next){
	if(serialPort == null || !serialPort.isOpen()){
		backend.error('Super Serial not connected. Attempting to reconnect...');
		connectionResetter.trigger = true;
	}else{
		var packetWriter = {
			'packet': packet,
			'go': function(){
				try{
					serialPort.write(this.packet, function(error, results){
						if(error){
							backend.error('Packet write error');
							backend.error(error);
						}else{
							backend.debug('Writing packet : ' + module.exports.byteArrayToHexString(packet));
						}
					});
					var packet = this.packet;
					serialPort.drain(function(error){
						if(error){
							backend.error('Packet write error');
							backend.error(error);
						}
						if(readWriteToggle){
							var settings = getSettings();

							var doToggle = function(){
								readWriteToggle.writeSync(1);
								if(next) next();
							};
							
							var delay = Math.ceil(1 / settings['Baud'] * packet.length * 10000);
							setTimeout(doToggle, delay);
						}else{
							if(next) next();
						}
					});
				}catch(exc){
					connectionResetter.trigger = true;
				}
			},
		};
		if(readWriteToggle){
			readWriteToggle.writeSync(0);
			setTimeout(packetWriter.go.bind(packetWriter), 20);
		}else{
			packetWriter.go();
		}
	}
}

/**
 * Convenience wrapper for building and queueueueing an ACK packet
 **/
function sendACK(packet){
	backend.debug('Sending ACK for ' + packet.transactionID + ' to ' + packet.from);
	packetQueue.queue(buildPacket(packet.from, SERIAL_COMMANDS['ACK'], packet.transactionID));
}

/**
 * if command is ACK, @payload parameter must contain the transactionID of the packet being ACK'd
 **/
function buildPacket(clientID, command, payload){
	var transactionID = -1;
	if(clientID == 255){		// broadcast packet
		var transactionID = 7;
	}else if(command == SERIAL_COMMANDS['ACK']){
		// If command is an ACK, payload parameter is abused to hold the transactionID
		// Note: need to call nextTransactionID no matter what (received packets increment the ID too, but that's not the ID that's sent
		var transactionID = clients[clientID].getNextTransactionID(payload);
		// ACK packets have no payload (parameter needs to be reset since we abused it)
		payload = [];
	}else{
		var transactionID = clients[clientID].getNextTransactionID();
	}

	return new Packet(transactionID, 0, clientID, command, payload);
}

function onData(data){
	var debugData = [];
	var worthShowing = dataBuffer.length > 0; // if we detected a packet start already, then this is always worth showing
	for(var i=0; i<data.length; i++){
		var val = Number(data[i]);
		debugData.push(val.toString(16));

		if(val != 0) worthShowing = true; // if any of the values are non-zero, it's worth showing
	}
	if(worthShowing) backend.debug("RAW Serial     : " + debugData);

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
			// We have a full packet. Let's process it :)
			backend.debug('Incoming packet: ' + module.exports.byteArrayToHexString(dataBuffer));
			var packet = new Packet(dataBuffer);
			if(packet.from != 0){
				if(packet.checkCRC()){
					if(packet.command == SERIAL_COMMANDS['ACK']){
						backend.debug('=============================');
						backend.debug('ACK received for ' + packet.transactionID + ', from ' + packet.from);
						backend.debug('=============================');
						// blah blah blah
						if(packet.from != 0 && packet.from != 255) packetQueue.onACKReceived(packet);
						watchdog.reset();
					}else{
						var handlePacket = function(){
							if(packet.from != 255){
								var client = clients[packet.from];
								var received = client.hasReceivedPacket(packet)
							}else{
								var received = false;
							}
							
							if(received){
								backend.debug('=============================');
								backend.debug('Received duplicate packet: ' + packet.from + '.' + packet.transactionID);
								backend.debug('=============================');
							}else{
								backend.debug('=============================');
								backend.debug(' Received : ' + dataBuffer);
								backend.debug('Unescaped : ' + packet.unescapedPacket);
								backend.debug('       ID : ' + packet.transactionID);
								backend.debug('     From : ' + packet.from);
								backend.debug('       To : ' + packet.to);
								backend.debug('  Command : ' + packet.command);
								backend.debug('  Payload : ' + packet.payload);
								backend.debug('=============================');
								broadcaster.broadcast(module.exports, 'serial-data-received', packet);
							}
							if(packet.from != 255){
								sendACK(packet);
							}
							watchdog.reset();
						};
						if(packet.from == 255 || clients[packet.from]){
							handlePacket();
						}else{
							backend.debug('Client does not exist :(');
							var prepAndSend = function(){
								reloadClients();
								handlePacket();
							};
							backend.addClient(packet.from, null, prepAndSend);
						}
					}
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
	
	actions: [
		{
			'name': 'Reset connection',
			'parameters': [
				{
					'name': 'Delay',
					'type': 'number',
					'value': '10',
				}
			],
			'execute': function(parameters, callback){
				module.exports.onDisable();
				if(parameters['Delay'] && parameters['Delay'] > 1){
					setTimeout(module.exports.onEnable, parseInt(parameters['Delay']));
				}else{
					module.exports.onEnable();
				}
				if(callback) callback();
			},
		}
	],
	onInstall: function(){},
	onUninstall: function(){},
	
	onEnable: function(){
		console.log('Super Serial enabled');
		connectionResetter.start();
		var settings = getSettings();
		
		if(serialPort){
			module.exports.onDisable();
		}
		serialPort = new SerialPort(settings['Port'], { 'baudrate': parseInt(settings['Baud']), 'autoOpen': false});

		serialPort.on('error', function(error){
			backend.error('Serial Port error: ' + error);
			connectionResetter.trigger = true;
		});
		
		serialPort.on('open', function(error){
			backend.debug('Super Serial connected!');
			if(settings['RW Toggle Pin']){
				try{
					readWriteToggle = new GPIO(settings['RW Toggle Pin'], 'out');
					readWriteToggle.writeSync(1);
				}catch(exc){
					backend.error('Super Serial Failed to toggle GPIO ' + settings['RW Toggle Pin']);
					backend.error(exc);
				}
			}

			watchdog.reset();
			try{
				serialPort.on('data', onData);
			}catch(exc){
				backend.error('Error while connecting super serial data callback');
				backend.error(exc);
				connectionResetter.trigger = true;
			}
		});
		
		serialPort.on('disconnect', function(error){
			backend.debug('Serial Port disconnected: ' + error);
			connectionResetter.trigger = true;
		});
		
		serialPort.open(function(err) {
			if(err){
				backend.error('Cannot open Super Serial port: ' + err.message);
				connectionResetter.trigger = true;
			}
		});
		
		reloadClients();
		broadcaster.subscribe(module.exports);
	},
	
	onDisable: function(){
		console.log('Super Serial disabled');
		watchdog.stop();
		connectionResetter.stop();
		broadcaster.unsubscribe(module.exports);
		module.exports.reset();
		if(serialPort){
			try{
				serialPort.close();
			}catch(exc){}
			
			serialPort = null;
			backend.debug('Super Serial disconnected');
		}
	},
	
	send: function(clientID, command, payload){
		var client = clients[clientID];
		var packet = buildPacket(clientID, command, payload);
		packetQueue.queue(packet);
	},
	
	broadcast: function(command, payload){
		packetQueue.queue(buildPacket(255, command, payload));
	},
	
	reconnect: function(){
		backend.debug("Super serial reconnecting");
		try{
			module.exports.onDisable();
		}catch(exc){
		}finally{
			serialPort = null;
		}
		
		setTimeout(module.exports.onEnable, 1000);
	},
	
	reset: function(){
		dataBuffer = [];
		escapeFlag = false;
		packetQueue.clear();
	},
	
	receiveMessage: function(source, messageID, data){
		if(messageID == 'client-updated'){
			if(data.details.clientID && (data.details.clientID != data.oldID)){
				module.exports.send(data.oldID, SERIAL_COMMANDS['ADDRESS'], parseInt(data.details.clientID));
				clients[data.details.clientID] = clients[data.oldID];
				delete clients[data.oldID];
			}
		}else if(messageID == 'client-deleted'){
			delete clients[data];
		}
	},

	
	stringToByteArray: function(str){
		var bytes = []
		for(var i=0; i<str.length; i++){
			bytes.push(str.charCodeAt(i));
		}
		return bytes;
	},

	
	hexStringToByteArray: function(str){
		var result = [];
		while(str && str.length >= 2) { 
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
