var SerialPort = require("serialport");

serialPort = new SerialPort.SerialPort(
	'/dev/pts/3', { baudrate: 9600},
	false
);
serialPort.on('open', function(error){
	if(error){
		console.log(error);
	}else{
		console.log('connected');
		serialPort.write('hi');
		console.log('said hi');
	}
});

serialPort.on('data', function(data){
	console.log('data received: ' + data);
});


serialPort.open();
