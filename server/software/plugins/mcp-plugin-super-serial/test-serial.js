var SERIAL_BYTES = {
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

var SerialPort = require("serialport");
var serialPort;

function onData(data){
	console.log("RAW: " + data.toString('hex'));
	
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
		console.log("Sending ack");
		//var ack = [0x7e, data[1], data[3], data[2], 0xAA, 0, 156, 102, 0x7e];
		var ack = [SERIAL_BYTES['START'], data[1], data[3], data[2], SERIAL_COMMANDS['ACK'], 0, 156, 102, 0x7e, 0x7e, 3, 1, 0, 3, 3, 1, 2, 3, 226, 197, SERIAL_BYTES['END']];
		serialPort.write(ack, function(error, results){
			if(error){
				console.error('Packet write error');
				console.error(error);
			}else{
				console.log("\tWrote packet: " + ack.toString('hex'));
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
			setTimeout(sendKey, 1000);
		}
	}
);

