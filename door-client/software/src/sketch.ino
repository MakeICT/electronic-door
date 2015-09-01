/**
 * @author Dominic Canare <dom@makeict.org>
 * 
 * Read from Serial and print on LCD. Vertical scroll on chr(13) or after 16 chars
 **/
#include <LiquidCrystal.h>

LiquidCrystal lcd(7, 6, 5, 4, 3, 2);

char buffer[16];
int count = 0;

void setup() {
	resetBuffer();

	Serial.begin(9600);
	lcd.begin(16, 2);
	lcd.setCursor(0, 0);
	
	lcd.print(" MakeICT.org :) ");
	lcd.setCursor(0, 1);
	lcd.print("  316.712.4391  ");
	
	count = 16;
	lcd.setCursor(0, 1);
	
	delay(1000);
	Serial.println("LCD ready!");
}

void resetBuffer(){
	for(int i=0; i<16; i++){
		buffer[i] = ' ';
	}
	count = 0;
}

void loop() {
	if(Serial.available() > 0){
		char c = Serial.read();
		if(c == 8 || c == 127){ // backspace
			if(count > 0){
				lcd.setCursor(--count, 1);
				lcd.print(' ');
				buffer[count] = ' ';
				lcd.setCursor(count, 1);
			}
		}else{
			if(count >= 16 || c == 13){
				// move the line up
				lcd.setCursor(0, 0);
				for(int i=0; i<16; i++){
					lcd.print(buffer[i]);
				}
				
				// clear the second line
				resetBuffer();
				lcd.setCursor(0, 1);
				lcd.print(buffer);
				
				// move the cursor to the beginning of the second line
				lcd.setCursor(0, 1);
			}
			if(c != 13){
				lcd.print(c);
				buffer[count++] = c;
			}
		}
	}
}
