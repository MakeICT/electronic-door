var backend = require('./backend.js');

module.exports = {
	listeners: [],
	
	/**
	 * All listeners must implement a "receiveMessage" function
	 * function receiveMessage(source, message, data)
	 **/
	subscribe: function(listener){
		if(!listener.receiveMessage){
			throw 'Invalid broadcast listener object';
		}
		// only allow a listener to be added once
		for(var i=0; i<module.exports.listeners.length; i++){
			if(module.exports.listeners[i] == listener) return;
		}
		
		module.exports.listeners.push(listener);
	},
	
	unsubscribe: function(listener){
		for(var i=0; i<module.exports.listeners.length; i++){
			if(module.exports.listeners[i] == listener){
				module.exports.listeners.splice(i, 1);
				return;
			}
		}
	},
	broadcast: function(source, message, data){
		if(backend.debug && message != 'log'){
			backend.debug('Broadcast message from ' + source + ' (' + message + ')' + JSON.stringify(data));
		}
		for(var i=0; i<module.exports.listeners.length; i++){
			try{
				module.exports.listeners[i].receiveMessage(source, message, data);
			}catch(exc){
				if(backend && backend.error){
					backend.error(module.exports.listeners[i].name + ' did something bad :(');
					backend.error(exc);
				}else{
					console.log(module.exports.listeners[i].name + ' did something bad :(');
					console.log(exc);
				}
			}
		}
	},
};
