var child_process = require('child_process');
var dgram = require('dgram');
var evt = require('events');
var io = require('socket.io');
var SerialPort = require("serialport").SerialPort;

var udpListenPort = 3947;
var udpClient = dgram.createSocket('udp4');

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
	child_process.exec('echo "' + message + '" | mail -s "Security system" fablab-wichita-exploration@googlegroups.com');
}

udpClient.on('message', function (msg, rinfo) {
	var ipAddress = rinfo.address;
	 
	//variable message
	if (msg[0] == 0x02 && msg[1] == 0x04) { 
		var msgContent = msg.toString('ascii');
		var msgType = msgContent.substring(msgContent.lastIndexOf('.')	+ 1, msgContent.indexOf('='));
		var msgValue = msgContent.substring(msgContent.indexOf('=') + 1).replace(/[^0-9a-z ]/i, '');
		switch(msgType) {
			case 'display':
				var displayText = msgValue.replace('\u0000', '');
				console.log("Display text: " + displayText);
				if(lcd.isOpen()){
					lcd.write('\n' + displayText);
				}
			break;
			case 'ArmStatus':
				// this.ArmStatus = ArmStatus.Disarmed;,	0=Disarmed,1=ArmedStay,2=ArmedAway
				var armStatus = parseInt(msgValue);
				console.log("Arm status: " + armStatus);
			break;
			case 'Ready': //0=NotReady,1=Ready
				var isReady = (msgValue == '1');
			break;
			case 'AlarmEvent':	//this.AlarmState = (count == 0 ? AlarmState.NoAlarm : AlarmState.Alarm);
				var alarmStatus = (msgValue == '0' ? 0 : 1);
				if(alarmStatus){
					sendEmail("The alarm is going off!");
				}
			break;
			 case 'FireEvent': //this.AlarmState = (count == 0 ? AlarmState.NoAlarm : AlarmState.Fire);
				var alarmStatus = (msgValue == '0' ? 1 : 2);
				if(alarmStatus){
					// @TODO: this doesn't work :(
					sendEmail("There's a fire!");
				}
			break;
			default: //ZS.3=0 // 0=NotFaulted,1,2=IsFaulted
				var zoneNumber = parseInt(msgType);
				if (!isNaN(zoneNumber)){
					var isFaulted = (msgValue != '0');
					console.log("Zone status [" + zoneNumber + "]: " + isFaulted);
				 }
			break;
		}
	}else if (msg[0] == 0x04 && msg[1] == 0x01) { //command message
		var msgContent = msg.toString('ascii');
		var msgValue = msgContent.substring(msgContent.lastIndexOf(':') + 1).replace(/[^0-9a-z ]/i, '');
		console.log(msgContent + " : " + msgValue);
		
		switch(msgValue){
			case 'Fire': //this.AlarmState = AlarmState.Fire;
				// @TODO: this doesn't work :(
				sendEmail("There's a fire!");
				break;
		}
	}	
});

//udp client
udpClient.on('listening', function () {
	var address = udpClient.address();
	console.log('udp client listening on ' + address.address + ":" + address.port);
});

udpClient.bind(udpListenPort);
