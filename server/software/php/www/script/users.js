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

	this.tagHoverIcon = create('img');
	this.tagHoverIcon.className = 'tagHoverIcon';
	this.tagContainer.appendChild(this.tagHoverIcon);
	
	var self = this;
	
	this.isExisting = function(){
		return self.tagContainer.parentNode.className.indexOf("unusedTagsBox") == -1;
	};
	this.hideHoverIcon = function(){
		self.tagHoverIcon.style.display = 'none';
	};

	this.showHoverIcon = function(){
		if(self.isExisting()){
			self.tagHoverIcon.src = 'images/tags/x.png';
			self.tagHoverIcon.alt = 'x';
		}else{
			self.tagHoverIcon.src = 'images/tags/+.png';
			self.tagHoverIcon.alt = '+';
		}
		self.tagHoverIcon.style.display = 'block';
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
					fixEmptyUnusedBox(parent.nextSibling);
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
					fixEmptyUnusedBox(parent);
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

function fixEmptyUnusedBox(box){
	if(box.childNodes.length > 1){
		box.firstChild.style.display = "none";
	}else{
		box.firstChild.style.display = "";
	}
}

function initTagUI(){
	var els = document.body.getElementsByTagName('div');

	var tagContainers = [];
	for(var i=0; i<els.length; i++){
		if(els[i].className.indexOf("tagContainer") > -1){
			for(var j=0; j<els[i].childNodes.length; j++){
				new Tag(els[i].childNodes[j], els[i].title);
			}
		}
		if(els[i].className.indexOf("unusedTagsBox") > -1){
			var toggleButton = create("div", "+");
			toggleButton.className = "toggleButton";
			toggleButton.onclick = function(){
				var el = this.parentNode.lastChild;
				if(el.style.visibility == "visible"){
					el.style.visibility = "hidden";
					el.style.height = 0;
					this.innerHTML = "+";
				}else{
					fixEmptyUnusedBox(el);
					el.style.visibility = "visible";
					el.style.height = "";
					this.innerHTML = "&minus;";
				}
			};
			var noneIndicator = create("div", "None!");
			noneIndicator.className = "text";
			els[i].insertBefore(noneIndicator, els[i].firstChild);
			els[i].parentNode.insertBefore(toggleButton, els[i].parentNode.firstChild);
			toggleButton.onclick();
			toggleButton.onclick();
			i++;
		}
	}
}



window.addEventListener('load', initTagUI, false);
