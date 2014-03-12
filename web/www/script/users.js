/**
 * MakeICT/Bluebird Arthouse Electronic Door Entry
 *
 * users.js - client-side code for user administration
 *
 * @author: Dominic Canare <dom@greenlightgo.org>
 **/

function Tag(tagContainer, email){
	this.tagContainer = tagContainer;
	this.userEmail = email;
	this.tag = tagContainer.title;
	// add X button
	this.tagRemoveIcon = create('img');
	this.tagRemoveIcon.src = 'images/tags/x.png';
	this.tagRemoveIcon.alt = 'x';
	this.tagRemoveIcon.className = 'tagRemoveIcon';
	
	this.tagContainer.appendChild(this.tagRemoveIcon);

	var self = this;
	this.hideRemoveIcon = function(){
		self.tagRemoveIcon.style.display = 'none';
	};

	this.showRemoveIcon = function(){
		self.tagRemoveIcon.style.display = 'block';
	};

	this.sendDrop = function(){
		new Ajax(
			'?ajax=1&action=dropUserTag&email=' + encodeURIComponent(self.userEmail) + '&tag=' + encodeURIComponent(self.tag),
			function(request){
				if(request.responseText == '0'){
					self.tagContainer.parentNode.removeChild(self.tagContainer);
				}else{
					alert('An error has occurred :(\n\n' + request.responseText);
				}
			},
			true,
			function(request){
				alert('An error has occurred! :(');
				console.log(request);
			}
		);
	};

	tagContainer.addEventListener('mouseover', this.showRemoveIcon, false);
	tagContainer.addEventListener('mouseout', this.hideRemoveIcon, false);
	tagContainer.addEventListener('click', this.sendDrop, false);
}


function initTagUI(){
	var els = document.body.getElementsByTagName('div');

	var tagContainers = [];
	for(var i=0; i<els.length; i++){
		if(els[i].className == 'userTags'){
			for(var j=0; j<els[i].childNodes.length; j++){
				new Tag(els[i].childNodes[j], els[i].title);
			}
		}
	}
}



window.addEventListener('load', initTagUI, false);
