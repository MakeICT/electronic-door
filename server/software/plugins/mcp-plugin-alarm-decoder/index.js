var backend = require('../../backend.js');
var ad2usb = require('./node_modules/ad2usb');

module.exports = {
	name: 'Alarm Decoder',
	alarm: null,
	options: {
		'IP': 'number',
		'Port': 'number',
		'Code': 'number',
	},
	
	actions: {
		'Arm away': function(callback){
			backend.getPluginOptions(module.exports.name, function(settings){
				module.exports.alarm.armAway(settings['Code']);
			});
		},
		'Arm stay': function(callback){
			backend.getPluginOptions(module.exports.name, function(settings){
				module.exports.alarm.armStay(settings['Code']);
			});
		},
		'Disarm': function(callback){
			backend.getPluginOptions(module.exports.name, function(settings){
				module.exports.alarm.disarm(settings['Code']);
			});
		},
	},
	
	onInstall: function(){
	},

	onUninstall: function(){
	},
	
	onEnable: function(){
		backend.getPluginOptions(module.exports.name, function(settings){
			var alarm = ad2usb.connect(settings['IP'], settings['Port'], function() {
				console.log("Connected");
				
				alarm.on('alarm', function(alarmStatus) {
					if(alarmStatus){
					}else{
					}
				});
				
				alarm.on('fireAlarm', function(alarmStatus) {
				});
				
				alarm.on('armedAway', function() {
				});
				
				alarm.on('disarmed', function() {
				});
			});
			module.exports.alarm = alarm;
		});
	},
	
	onDisable: function(){
		module.exports.alarm.socket.destroy();
		module.exports.alarm = null;
	},	
};
