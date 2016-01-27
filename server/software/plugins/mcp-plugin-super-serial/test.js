var SerialPort = require("serialport");

serialPort = new SerialPort.SerialPort(
	'/dev/ttyAMA0', { baudrate: 9600},
	true,
	function(error){
		if(error){
			console.log(error);
		}else{
			console.log('connected');
			serialPort.write('hi');
			console.log('said hi');
		}
	}
);

serialPort.on('data', function(data){
	console.log('data received: ' + data);
});
