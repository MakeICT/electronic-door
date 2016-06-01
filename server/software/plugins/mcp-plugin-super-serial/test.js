var SerialPort = require("serialport");

serialPort = new SerialPort.SerialPort(
	'/dev/pts/4', { baudrate: 9600},
	false
);
serialPort.on('open', function(error){
	if(error){
		console.log(error);
	}else{
		console.log('connected');
	}
});

serialPort.on('data', function(data){
	console.log('data received: ' + data);
});


serialPort.open();
