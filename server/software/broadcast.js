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
		for(var i=0; i<module.exports.listeners.length; i++){
			module.exports.listeners[i].receiveMessage(source, message, data);
		}
	},
};
