/**
 * Dominic Canare
 * dom@domstyle.net
 **/

/**
 * DOM tools
 **/
function e(id){ return document.getElementById(id); }

function create(tag, child){
	var el = document.createElement(tag);
	
	if(child !== undefined){
		if(child.tagName){
			el.appendChild(child);
		}else{
			el.appendChild(t(child));
		}
	}
	return el;
}
function t(contents){ return document.createTextNode(contents); }
function createImage(src, width, height, onload){
	var el = create("img");
	if(onload) el.onload = onload;
	el.src = src;
	if(width) el.width = width;
	if(height) el.height = height;
	
	return el;
}


function stripTextNodes(el){
	for(var i=0; i<el.childNodes.length; i++){
		var node = el.childNodes[i];
		if(node.nodeType == 8 || (node.nodeType == 3 && node.nodeValue.trim() == "")){
			el.removeChild(node);
			i--;
		}
	}
	
	return el;
}

function getRectangle(el){
	return [
		el.offsetLeft || 0,
		el.offsetTop || 0,
		el.offsetWidth || 0,
		el.offsetHeight || 0,
	];
}

function removeClassName(el, className){
	el.className = el.className.replace(new RegExp("\\b" + className + "\\b"), "");
}

/**
 * OOP
 **/
Object.create = function (o) {
	function F() {}
	F.prototype = o;
	return new F();
};

function inheritPrototype(childObject, parentObject) {
	var copyOfParent = Object.create(parentObject.prototype);
	copyOfParent.constructor = childObject;
	childObject.prototype = copyOfParent;
}


/**
 * String operations
 **/
String.prototype.toTitleCase = function(){
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

if(!String.prototype.trim) {
	String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g,''); };
}

/**
 * Date operations
 **/
Date.prototype.toSimpleString = function(showTime){
	var year = this.getFullYear();
	var month = this.getMonth() + 1;
	var date = this.getDate();
	if(month < 10) month = "0" + month;
	if(date < 10) date = "0" + date;
	
	return year + "/" + month + "/" + date;
};

Date.prototype.toUTC = function(){
	return new Date(this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate(), this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds());
};

Date.prototype.diffInDays = function(b){
	var _MS_PER_DAY = 1000 * 60 * 60 * 24;

	var utc1 = Date.UTC(this.getFullYear(), this.getMonth(), this.getDate());
	var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

	return Math.floor((utc2 - utc1) / _MS_PER_DAY);
};


/**
 * Array operations
 **/
Array.prototype.removeObject = function(obj) {
	var index = this.indexOf(obj);
	if(index > -1){
		this.remove(index);
	}
};

Array.prototype.remove = function(from, length) {
	if(length === undefined) length = 1;
	this.splice(from, length);
};
/**
 * Matrix operations
 **/
Array.prototype.transpose = function(){
	return $M(this).transpose().elements;
}
Array.prototype.determinant = function(){
	return $M(this).determinant;
};
Array.prototype.inverse = function(){
	return $M(this).inverse().elements;
};
Array.prototype.multiply = function(m){
	return $M(this).multiply(m).elements;
};

/**
 * Ajax
 **/
function Ajax(request, okCallback, asynch, errorCallback, updateCallback){
	if(!asynch) asynch = false;

	var self = this;
	this.httpRequest = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	this.httpRequest.onreadystatechange = function(){
		if(self.httpRequest.readyState === 4){
			if(self.httpRequest.status === 200){
				if(okCallback) okCallback(self.httpRequest);
			}else{
				if(errorCallback) errorCallback(self.httpRequest);
			}
		}else{
			if(updateCallback) updateCallback(self.httpRequest);
		}
	};

	this.httpRequest.open('GET', request, asynch);
	this.httpRequest.send(null);
}
