var child_process = require('child_process');
var dgram = require('dgram');
var evt = require('events');
var io = require('socket.io');

var udpListenPort = 3947;
var udpClient = dgram.createSocket('udp4');

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
				sendEmail("There's a fire!");
			}else{
				console.log("Fire alarm status: " + alarmStatus);
				console.log("msgValue: " + msgValue);
			break;
		default: //ZS.3=0 // 0=NotFaulted,1,2=IsFaulted
			var zoneNumber = parseInt(msgType);
			if (!isNaN(zoneNumber)){
				var isFaulted = (msgValue != '0');
			 }
			console.log("Zone status [" + zoneNumber + "]: " + isFaulted);
			break;
		}
	}else if (msg[0] == 0x04 && msg[1] == 0x01) { //command message
		var msgContent = msg.toString('ascii');
		var msgValue = msgContent.substring(msgContent.lastIndexOf(':') + 1).replace(/[^0-9a-z ]/i, '');
		console.log(msgContent + " : " + msgValue);
		/*
		switch(msgValue){
			case 'Alarm': // this.AlarmState = AlarmState.Alarm;
				if (ICM.alarmStatus != 1){
					ICM.alarmStatus = 1;
					ICM.events.emit('alarmStatusChanged', ICM.alarmStatus);
				}
				break;
			case 'Fire': //this.AlarmState = AlarmState.Fire;
				if (ICM.alarmStatus != 2){
					ICM.alarmStatus = 2;
					ICM.events.emit('alarmStatusChanged', ICM.alarmStatus);		 
				}
				break;
			case 'Armed Away': //this.ArmStatus = ArmStatus.ArmedAway;
				if (ICM.armStatus != 2){
				ICM.armStatus = 2;
				ICM.events.emit('armStatusChanged', ICM.armStatus);
				}
				break;
			case 'Armed Stay': //this.ArmStatus = ArmStatus.ArmedStay;
				if (ICM.armStatus != 1){
				ICM.armStatus = 1;
				ICM.events.emit('armStatusChanged', ICM.armStatus);
				}
				break;
			case 'Disarmed': //this.ArmStatus = ArmStatus.Disarmed;
				if (ICM.armStatus != 0){
				ICM.armStatus = 0;
				ICM.events.emit('armStatusChanged', ICM.armStatus);
				}
				break;
			case 'Low Battery':
				ICM.events.emit('statusEvent', 1);
				break;
			case 'Power Failure':
				ICM.events.emit('statusEvent', 2);
				break;
			case 'Power Returned':
				ICM.events.emit('statusEvent', 3);
				break;
			}
			*/
	}	
});

//udp client
udpClient.on('listening', function () {
	var address = udpClient.address();
	console.log('udp client listening on ' + address.address + ":" + address.port);
});
/*
//http file server
function serverHandler (req, res) {
	if (req.url.indexOf('/execute') == 0){
	var url = require('url');
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	ICM.executeCommand(query.command)
	
	res.writeHead(200);
	res.end('Command Executed: ' + query.command);
	} else { 
		req.addListener('end', function () {
		fileServer.serve(req, res);
		}).resume();
	}
}

ICM.events.on('displayChanged', function(displayText){ 
	webSocketServer
		.of('/display')
		.emit('updated', { text: displayText });
	});

//load hooks
require('fs').readdirSync(__dirname + '/hooks/').forEach(function(file) {
	if (file.indexOf('.js') > -1) {
	console.log('Loading Hook: ' + file);
	require(__dirname + '/hooks/' + file)(ICM);
	}
});

ICM.events.on('displayChanged', function(display){
	console.log('Display: ' + display);
});

ICM.events.on('armStatusChanged', function(armStatus){
	console.log('Arm Status: ' + armStatus);
});

ICM.events.on('readyChanged', function(isReady){
	console.log('Ready: ' + isReady);

	//zoneStatusChanged events are slow from the ICM but readyChanged event is quick so we'll
	//use it as an indirect way to detect zoneStatusChanged (unfaulted).
	Object.keys(ICM.zones).forEach(function (key) { 
		if (ICM.zones[key] == true) {
			ICM.zones[key] = false;
			ICM.events.emit('zoneStatusChanged', key, false);
		} 
		});
});

ICM.events.on('alarmStatusChanged', function(alarmStatus){
	console.log('Alarm Status: ' + alarmStatus);
});

ICM.events.on('zoneStatusChanged', function(zoneNumber, isFaulted){
	console.log('Zone: ' + zoneNumber + ', ' + isFaulted);
});

ICM.events.on('statusEvent', function(statusEvent){
	console.log('Status Event: ', statusEvent);
});
*/
udpClient.bind(udpListenPort);
//webServer.listen(config.http_listen_port);
