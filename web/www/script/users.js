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
	
	this.isExisting = function(){
		return self.tagContainer.parentNode.className.indexOf("unusedTagsBox") == -1;
	};
	this.hideHoverIcon = function(){
		self.tagRemoveIcon.style.display = 'none';
	};

	this.showHoverIcon = function(){
		if(self.isExisting()){
			self.tagRemoveIcon.style.display = 'block';
		}
	};

	this.sendDrop = function(){
		new Ajax(
			'?ajax=1&action=dropUserTag&email=' + encodeURIComponent(self.userEmail) + '&tag=' + encodeURIComponent(self.tag),
			function(request){
				if(request.responseText == '0'){
					var parent = self.tagContainer.parentNode;
					parent.removeChild(self.tagContainer);
					parent.nextSibling.appendChild(self.tagContainer);
					self.hideHoverIcon();
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

	this.sendAdd = function(){
		new Ajax(
			'?ajax=1&action=addUserTag&email=' + encodeURIComponent(self.userEmail) + '&tag=' + encodeURIComponent(self.tag),
			function(request){
				if(request.responseText == '0'){
					var parent = self.tagContainer.parentNode;
					parent.removeChild(self.tagContainer);
					parent.previousSibling.appendChild(self.tagContainer);
					self.hideHoverIcon();
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

	this.click = function(event){
		if(self.isExisting()){
			self.sendDrop();
		}else{
			self.sendAdd();
		}
	};

	tagContainer.addEventListener('mouseover', this.showHoverIcon, false);
	tagContainer.addEventListener('mouseout', this.hideHoverIcon, false);
	tagContainer.addEventListener('click', this.click, false);
}

/*
function UserTagControl(container){
	var self = this;
	this.container = container;
	this.userEmail = this.container.title;
	this.tagList = [];
	for(var j=0; j<this.container.childNodes.length; j++){
		this.tagList.push(new Tag(this.container.childNodes[j], this.userEmail));
	}
	
	this.tagAdderButton = create("div", "+");
	this.tagAdderButton.className = 'tagAdder';
	this.tagAdderButton.title = "Add a tag";
	this.unusedTagsBox = create("div");
	this.unusedTagsBox.className = "unusedTagsBox";
	this.container.parentNode.appendChild(this.unusedTagsBox);

	this.tagAdderButton.onclick = function(){
		var allTags = UserTagControl.getTags();
		var unusedTags = [];
		for(var i=0; i<allTags.length; i++){
			var haveIt = false;
			for(var j=0; j<self.tagList.length; j++){
				if(allTags[i].tag == self.tagList[j].tag){
					haveIt = true;
					break;
				}
			}
			if(!haveIt){
				unusedTags.push(allTags[i]);
			}
		}

		for(var i=0; i<unusedTags.length; i++){
			new Tag(self.unusedTagsBox, self.userEmail);
		}
	};

	this.container.appendChild(this.tagAdderButton);
}
UserTagControl.getTags = function(){
	if(!UserTagControl.tagList){
		UserTagControl.tagList = JSON.parse(simpleAjax('?action=getTags'));
	}
	return UserTagControl.tagList;
};
*/

function initTagUI(){
	var els = document.body.getElementsByTagName('div');

	var tagContainers = [];
	for(var i=0; i<els.length; i++){
		if(els[i].className.indexOf("tagContainer") > -1){
			for(var j=0; j<els[i].childNodes.length; j++){
				console.log(els[i].childNodes[j].title);
				new Tag(els[i].childNodes[j], els[i].title);
			}
		}
	}
}



window.addEventListener('load', initTagUI, false);
