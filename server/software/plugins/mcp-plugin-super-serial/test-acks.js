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
		var ack = [0x7e, data[1], data[3], data[2], 0xAA, 0, 156, 102, 0x7e];
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

serialPort = new SerialPort.SerialPort(
	'/dev/pts/4',
	{ baudrate: 9600},
	true,
	function(error){
		if(error){
			console.error('Serial connection error');
			console.error(error);
		}else{
			console.log('Super Serial connected');
			serialPort.on('data', onData);
		}
	}
);
