var SerialPort = require("serialport");

serialPort = new SerialPort.SerialPort(
	'/dev/ttyAMA0', { baudrate: 9600}
);
serialPort.write('hi');
