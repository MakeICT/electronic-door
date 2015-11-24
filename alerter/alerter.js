var child_process = require('child_process');
var SerialPort = require("serialport").SerialPort;
var lcd;
function connectToLCD(counter){
	if(!counter || counter > 9) counter = 0;
	
	var port = "/dev/ttyUSB" + counter;
	lcd = new SerialPort(port, {
		baudrate: 9600
	}).on('open', function(data){
		console.log("LCD Connected to " + port + " :)");
	}).on('error', function(data){
		setTimeout(function(){
			connectToLCD(counter+1);
		}, 500);
	}).on('close', function(data){
		console.log("LCD Disconnected :(");
		setTimeout(function(){
			connectToLCD(counter+1);
		}, 500);
	});
}
connectToLCD();

function sendEmail(message){
	console.log("Sending email: " + message);
	child_process.exec('echo "' + message + '" | mail -s "JUST TESTING Security system" fablab-wichita-exploration@googlegroups.com');
}

var config = require('fs').readFileSync('/home/pi/code/makeictelectronicdoor/vista/DOOR_CODE').toString().trim().split('\t');
var alarmOptions = {
	'ip': config[0],
	'port': config[1],
	'code': config[2],
};

var alarm = require('ad2usb').connect(alarmOptions.ip, alarmOptions.port, function() {
	alarm.on('alarm', function(alarmStatus) {
		if(alarmStatus) sendEmail("<a href='https://makeict.greenlightgo.org'>The alarm is going off!</a>");
	});
	
	alarm.on('fireAlarm', function(alarmStatus) {
		if(alarmStatus) sendEmail("The fire alarm is going off!");
	});
	
	alarm.on('armedAway', function() {
		if(lcd.isOpen()){
			lcd.write('\nThe alarm ARMED!\nYou may not exit');
		}
	});
	
	alarm.on('Disarmed', function() {
		if(lcd.isOpen()){
			lcd.write('\nPress button for\n1s, wait for msg');
		}
	});
	
});
