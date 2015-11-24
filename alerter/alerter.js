var child_process = require('child_process');
var SerialPort = require("serialport").SerialPort;
var lcd;
function connectToLCD(counter){
	if(!counter || counter > 9) counter = 0;
	
	var port = "/dev/ttyUSB" + counter;
	lcd = new SerialPort(port, {
		baudrate: 9600
	});
	lcd.on('open', function(data){
		console.log("LCD Connected to " + port + " :)");
		setTimeout(function(){
			lcd.write("Press button for1s. Wait for msg");
		}, 3000);
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
	child_process.exec('echo "' + message + '" | mail -s "Security system alarm!" fablab-wichita-exploration@googlegroups.com');
}

var config = require('fs').readFileSync('/home/pi/code/makeictelectronicdoor/vista/DOOR_CODE').toString().trim().split('\t');
var alarmOptions = {
	'ip': config[0],
	'port': config[1],
	'code': config[2],
};

var alarm = require('ad2usb').connect(alarmOptions.ip, alarmOptions.port, function() {
	alarm.on('alarm', function(alarmStatus) {
		if(alarmStatus){
			sendEmail("The alarm is going off! https://makeict.greenlightgo.org");
			if(lcd.isOpen()) lcd.write("ALARM TRIGGERED!  316.712.4391  ");
		}else{
			if(lcd.isOpen()) lcd.write("Press button for1s. Wait for msg");
		}
	});
	
	alarm.on('fireAlarm', function(alarmStatus) {
		if(alarmStatus){
		       	sendEmail("The fire alarm is going off!");
			if(lcd.isOpen()) lcd.write("ALARM TRIGGERED!  316.712.4391  ");
		}
       	});
	
	alarm.on('armedAway', function() {
		if(lcd.isOpen()) lcd.write("The alarm ARMED!You may now exit");
	});
	
	alarm.on('disarmed', function() {
		if(lcd.isOpen()) lcd.write("Press button for1s. Wait for msg");
	});
}); 
