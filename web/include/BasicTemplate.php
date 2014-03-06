<?php

class BasicTemplate {
	function __construct($templateText, $title='', $bonusCSS=null, $bonusJS=null) {
		$this->template = $templateText;
		$this->bonusCSS = ($bonusCSS == null ? array() : $bonusCSS);
		$this->bonusJS = ($bonusJS == null ? array() : $bonusJS);
		
		if(!is_array($this->bonusCSS)) $this->bonusCSS = array($bonusCSS);
		if(!is_array($this->bonusJS)) $this->bonusJS = array($bonusJS);

		if(trim($title) != ""){
			$title = " - $title";
		}else{
			$title = "";
		}
		
		$this->replace('TITLE', $title);
	}
	
	function replace($match, $text){
		$this->template = str_replace('{{'.$match.'}}', $text, $this->template);
	}
	
	function render(){
		$buffer = '';
		foreach($this->bonusCSS as $f){
			$buffer .= "<link href=\"$f\" rel=\"stylesheet\" type=\"text/css\" />\n\t\t";
		}
		$this->replace('ADDITIONAL_CSS', $buffer);
		
		$buffer = '';
		foreach($this->bonusJS as $f){
			$buffer .= "<script type=\"text/javascript\" src=\"$f\"></script>\n\t\t";
		}
		$this->replace('ADDITIONAL_JAVASCRIPT', $buffer);
		
		$this->template = preg_replace('/\{\{[^\}]*\}\}/s', '', $this->template);
		echo $this->template;
	}
	
	function bufferStart(){
		ob_start();
	}
	
	function bufferStop($bufferTemplate){
		$buffer = ob_get_contents();
		ob_end_clean();
		
		$this->replace($bufferTemplate, $buffer);
		$this->render();
	}
}
