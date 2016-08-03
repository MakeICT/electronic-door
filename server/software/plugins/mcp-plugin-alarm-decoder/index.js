var backend = require('../../backend.js');
var broadcaster = require('../../broadcast.js');
var ad2usb = require('./node_modules/ad2usb');

var alarm;

var ARM_ALARM = 0x06;
var reconnectTimer;
var statusChecker = {
	'status': null,
	'timer': null,
	'setStatus': function(status){
		clearTimeout(statusChecker.timer);
		statusChecker.status = status;
		statusChecker.timer = setTimeout(statusChecker.itsForReal, 5000);
	},
	'itsForReal': function(){
		backend.error(module.exports.name + ': ' + statusChecker.status);
		broadcaster.broadcast(module.exports, statusChecker.status, {});
	},
};

module.exports = {
	name: 'Alarm Decoder',
	options: [
		{
			'name': 'IP',
			'type': 'number',
			'value': null,
		},{	
			'name': 'Port',
			'type': 'number',
			'value': 10000,
		},{	
			'name': 'Code',
			'type': 'password',
			'value': null,
		},
	],
	
	actions: [
		{
			'name': 'Arm away',
			'parameters': [],
			'execute': function(parameters, callback){
				backend.getPluginOptions(module.exports.name, function(settings){
					backend.log(module.exports.name + ': Sending *arm away*');
					alarm.armAway(settings['Code']);
					if(callback) callback();
				});
			},
		},{
			'name': 'Arm stay',
			'parameters': [],
			'execute': function(parameters, callback){
				backend.getPluginOptions(module.exports.name, function(settings){
					backend.log(module.exports.name + ': Sending *arm stay*');
					alarm.armStay(settings['Code']);
					if(callback) callback();
				});
				
			},
		},{
			'name': 'Disarm',
			'parameters': [],
			'execute': function(parameters, callback){
				backend.getPluginOptions(module.exports.name, function(settings){
					backend.log(module.exports.name + ': Sending *disarm*');
					alarm.disarm(settings['Code']);
					if(callback) callback();
				});
			},
		}
	],
	
	onInstall: function(){},

	onUninstall: function(){},
	
	onEnable: function(){
		backend.getPluginOptions(module.exports.name, function(settings){
			try{
				ad2usb.errorHandler = function(error){
					backend.error('Alarm Decoder failed: ' + error.code);
					clearTimeout(reconnectTimer);
					reconnectTimer = setTimeout(module.exports.onEnable, 5000);
				};
				
				alarm = ad2usb.connect(settings['IP'], settings['Port'], function() {
					backend.log('Alarm Decoder connected');
					broadcaster.subscribe(module.exports);
					
					alarm.on('alarm', function(status) {
						if(status){
							backend.error(module.exports.name + ': alarm triggered!');
							backend.getRecentLog(20, function(log){
								broadcaster.broadcast(module.exports, "alarm-triggered", log);
							});
						}
					});
					
					alarm.on('fireAlarm', function(status) {
						if(status){
							backend.error(module.exports.name + ': fire alarm triggered!');
							broadcaster.broadcast(module.exports, "fire-alarm-triggered", {});
						}
					});
					
					alarm.on('armedAway', function() {
						statusChecker.setStatus('alarm-armed-away');
					});
					
					alarm.on('armedStay', function() {
						statusChecker.setStatus('alarm-armed-stay');
					});
					
					alarm.on('disarmed', function() {
						statusChecker.setStatus('alarm-armed-disarmed');
					});
					
					alarm.on('fault', function(zone) {
						backend.debug('Fault in zone: ' + zone);
					});
					
					alarm.on('raw', function(sec1, sec2, sec3, sec4) {
						// These are LCD status updates usually
						/*
						backend.debug(module.exports.name + ' (raw): ' + sec1);
						backend.debug(module.exports.name + ' (raw): ' + sec2);
						backend.debug(module.exports.name + ' (raw): ' + sec3);
						backend.debug(module.exports.name + ' (raw): ' + sec4);
						*/
					});
					
					alarm.on('error', function() {
						backend.error(module.exports.name + ': socket error. Attempting to reconnect');
						module.exports.onDisable();
						module.exports.onEnable();
					});
				});
			}catch(exc){
				backend.log('Failed to start AlarmDecoder Plugin', null, null, 'error');
				clearTimeout(reconnectTimer);
				reconnectTimer = setTimeout(module.exports.onEnable, 5000);
			}
		});
	},
	
	onDisable: function(){
		clearTimeout(reconnectTimer);
		alarm.socket.destroy();
		alarm = null;
		broadcaster.unsubscribe(module.exports);
	},
	
	receiveMessage: function(source, message, data){
		if(message == "door-unlocked"){
			backend.getPluginOptions(module.exports.name, function(settings){
				backend.log(module.exports.name + ': Sending *disarm*');
				alarm.disarm(settings['Code']);
			});
		}else if(message == 'serial-data-received'){
			if(data['to'] == 0){
				if(data['command'] == ARM_ALARM){
					backend.getPluginOptions(module.exports.name, function(settings){
						backend.log(module.exports.name + ': Sending *arm away*');
						alarm.armAway(settings['Code']);
					});
				}
			}
		}
	},
};
