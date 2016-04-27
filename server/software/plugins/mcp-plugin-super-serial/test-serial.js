var SerialPort = require("serialport");
var crc = require('crc');

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
var serialPort;



function lookupCommand(b){
	for(var command in SERIAL_COMMANDS){
		if(SERIAL_COMMANDS[command] == b){
			return command;
		}
	}
}

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
//console.log(breakupBytes([39963])); return;

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
		console.log('constructing packet from bytes');
		if(typeof(rawBytesOrTransactionID) === "string"){
			var stringData = rawBytesOrTransactionID;
			rawBytesOrTransactionID = [];
			for(var i=0; i<stringData.length; i++){
				rawBytesOrTransactionID.push(stringData.charCodeAt(i));
			}
		}

		var bytes = rawBytesOrTransactionID;
		for(var j=0; j<bytes.length; j++){
			if(bytes[j] == SERIAL_FLAGS['ESCAPE'] && !escapeFlag){
				escapeFlag = true;
			}else{
				this.unescapedPacket.push(bytes[j]);
				escapeFlag = false;
			}
		}
		console.log('escapes are done');
		this.transactionID = this.unescapedPacket[1];
		this.from = this.unescapedPacket[2];
		this.to = this.unescapedPacket[3];
		this.command = this.unescapedPacket[4];
		this.payload = this.unescapedPacket.slice(6, 6+this.unescapedPacket[5]);
		console
	}else{
		console.log('constructing packet from data ' + rawBytesOrTransactionID);
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
		return this.bytes;
	};
	
	console.log('packet object created!');
}

function onData(data){
	var packet = new Packet(data);

	console.log('=============================');
	console.log(' Received : ' + data.toString('hex'));
	console.log('Unescaped : ' + packet.unescapedPacket);
	console.log('       ID : ' + packet.transactionID);
	console.log('     From : ' + packet.from);
	console.log('       To : ' + packet.to);
	console.log('  Command : ' + packet.command);
	console.log('  Payload : ' + packet.payload);
	console.log('=============================');
	
	var sendEcho = function(){
		console.log("Echo-ing");
		serialPort.write(data, function(error, results){
			if(error){
				console.error('Packet write error');
				console.error(error);
			}else{
				console.log("\tWrote packet: " + data.toString('hex'));
			}
		});
	};
	
	var sendAck = function(){
		var ack = new Packet(packet.transactionID, packet.to, packet.from, SERIAL_COMMANDS['ACK']);
		serialPort.write(ack.bytes, function(error, results){
			if(error){
				console.error('Packet write error');
				console.error(error);
			}else{
				console.log("\tWrote packet: " + ack.bytes.toString('hex'));
			}
		});
	};
	setTimeout(sendEcho, 0);
	setTimeout(sendAck, 2000);
}

function sendKey(){
	console.log("Sending key");
	var unlock = [SERIAL_BYTES['START'], 1, 1, 0, SERIAL_COMMANDS['KEY'], 3, 1, 2, 3, 226, 197, SERIAL_BYTES['END']];
	serialPort.write(unlock, function(error, results){
		if(error){
			console.error('Packet write error');
			console.error(error);
		}else{
			console.log("\tWrote packet: " + unlock.toString('hex'));
		}
	});
}
function sendTest(){
	console.log("Sending test");
	var test = [250,4,0,1,170,0,160,254,250,251];
	
	serialPort.write(test, function(error, results){
		if(error){
			console.error('Packet write error');
			console.error(error);
		}else{
			console.log("\tWrote packet: " + test.toString('hex'));
		}
	});
}

function armAlarm(){
	console.log("Arming alarm");
	var unlock = [SERIAL_BYTES['START'], 1, 1, 0, SERIAL_BYTES['ARM'], 0, 156, 27, SERIAL_BYTES['END']];
	serialPort.write(unlock, function(error, results){
		if(error){
			console.error('Packet write error');
			console.error(error);
		}else{
			console.log("\tWrote packet: " + unlock.toString('hex'));
		}
	});
}



serialPort = new SerialPort.SerialPort(
	process.argv[2],
	{ baudrate: 9600},
	true,
	function(error){
		if(error){
			console.error('Serial connection error');
			console.error(error);
		}else{
			console.log('Super Serial connected');
			serialPort.on('data', onData);
//			setTimeout(sendTest, 1000);
		}
	}
);

