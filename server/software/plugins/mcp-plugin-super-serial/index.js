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

function getSettings(){
	return backend.regroup(module.exports.options, 'name', 'value');
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
		console
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
		
		this.waitingForAck = true;
		
		this._doSend();
	},
	
	'_doSend': function(){
		var settings = getSettings();
		var timeoutPeriod = 0+settings['Timeout'];
		_sendPacket(this.lastPacketInfo.bytes);

		if(timeoutPeriod){
			this.ackTimeout = setTimeout(this.onACKTimeout.bind(this), timeoutPeriod);
		}
	},
	
	'_doneWaiting': function(){
		clearTimeout(this.ackTimeout);
		this.retries = 0;
		this.waitingForACK = false;
		this.dequeue();
	},
	
	'onACKTimeout': function(){
		var settings = getSettings();
		var maxRetries = 0+settings['Max retries'];
		
		if(++this.retries > maxRetries){
			backend.error('Packet failed :( ' + this.lastPacketInfo.toString());
			this._doneWaiting();
		}else{
			backend.debug('Resending packet ' + this.lastPacketInfo.toString());
			this._doSend();
		}
	},
	
	'onACKReceived': function(packet){
		if(this.lastPacketInfo && packet.from == this.lastPacketInfo.to && packet.transactionID == this.lastPacketInfo.transactionID){
			this._doneWaiting();
		}
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
		return false; // @TODO: make this work so it doesn't re-process already seen packets
	}

}
var clients = {};

// This packet should already have the endcaps
function _sendPacket(packet){
	if(serialPort == null || !serialPort.isOpen()){
		backend.error('Super Serial not connected. Attempting to reconnect...');
		module.exports.reconnect();
		setTimeout(function(){ _sendPacket(packet); }, 100);
	}else{
		var packetWriter = {
			'packet': packet,
			'go': function(){
				serialPort.write(this.packet, function(error, results){
					if(error){
						backend.error('Packet write error');
						backend.error(error);
					}
				});
				var packet = this.packet;
				serialPort.drain(function(error){
					if(error){
						backend.error('Packet write error');
						backend.error(error);
					}else{
						backend.debug('Wrote packet   : ' + module.exports.byteArrayToHexString(packet));
					}
					if(readWriteToggle) setTimeout(function(){readWriteToggle.writeSync(1);}, 10);
				});
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

function sendACK(packet){
	backend.debug('Sending ACK for ' + packet.transactionID + ' to ' + packet.from);
	_sendPacket(buildPacket(packet.from, SERIAL_COMMANDS['ACK'], packet.transactionID));
}

/**
 * If command is an ACK, payload should be the transactionID
 **/
function buildPacket(clientID, command, payload){
	// call nextTransactionID no matter what
	// (received packets increment the ID too, but that's not the ID that's sent
	var transactionID = -1;
	if(command == SERIAL_COMMANDS['ACK']){
		var transactionID = clients[clientID].getNextTransactionID(payload[0]);
	}else{
		var transactionID = clients[clientID].getNextTransactionID();
	}

	return new Packet(transactionID, 0, clientID, command, payload);
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
			// We have a full packet. Let's process it :)
			backend.debug('Incoming packet: ' + dataBuffer);
			var packet = new Packet(dataBuffer);
			if(packet.from != 0){
				if(packet.checkCRC()){
					if(packet.command == SERIAL_COMMANDS['ACK']){
						backend.debug('=============================');
						backend.debug('ACK received for ' + packet.transactionID + ', from ' + packet.from);
						backend.debug('=============================');
						// blah blah blah
						if(packet.from != 0) packetQueue.onACKReceived(packet);
					}else{
						if(client.hasReceivedPacket(packet)){
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
							sendACK(packet);
							broadcaster.broadcast(module.exports, 'serial-data-received', packet);
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
							try{
								readWriteToggle = new GPIO(settings['RW Toggle Pin'], 'out');
								readWriteToggle.writeSync(1);
							}catch(exc){
								backend.error('Super Serial Failed to toggle GPIO ' + settings['RW Toggle Pin']);
							}
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
	
	send: function(clientID, command, payload){
		var client = clients[clientID];
		var packet = buildPacket(clientID, command, payload);
		packetQueue.queue(packet);
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
	
	stringToByteArray: function(str){
		var bytes = []
		for(var i=0; i<str.length; i++){
			bytes.push(str.charCodeAt(i));
		}
		return bytes;
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
