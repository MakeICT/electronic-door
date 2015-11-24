var config = require('fs').readFileSync('DOOR_CODE').toString().trim().split('\t');
var alarmOptions = {
	'ip': config[0],
	'port': config[1],
	'code': config[2],
};

if(process.argv.length < 3){
	console.error("Usage: " + process.argv[0] + " " + process.argv[1] + " command");
	process.exit(1);
}

var alarm = require('ad2usb').connect(alarmOptions.ip, alarmOptions.port, function() {
	alarm[process.argv[2]](alarmOptions.code);
});
