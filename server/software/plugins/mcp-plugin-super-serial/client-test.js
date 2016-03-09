var SerialPort = require('serialport');
var crc = require('crc');

var serialPort;

var escapeChar = 0x7D;
var messageEndcap = 0x7E;

var dataBuffer = [];
var escapeFlag = false;

function onData(data){
	console.log(data);
	for(var i=0; i<data.length; i++){
		var byte = data[i];
		if(byte == messageEndcap && !escapeFlag){
			if(dataBuffer.length > 0){
				// We have a full packet. Let's process it :)
				packet = {
					'transactionID': dataBuffer[0],
					'from': dataBuffer[1],
					'to': dataBuffer[2],
					'function': dataBuffer[3],
					'data': dataBuffer.slice(5, 5+dataBuffer[4]),
				};
				
				//console.log(packet);
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

serialPort = new SerialPort.SerialPort(
	'/dev/pts/4',
	{ baudrate: 9600 },
	true,
	function(error){
		if(error){
			console.error(error);
		}else{
			console.log('Fake client connected');
			serialPort.on('data', onData);
		}
	}
);
