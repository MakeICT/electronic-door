#include "lcd.h"

#include <Arduino.h>

LiquidCrystal lcd(3, 4, A2, A3, A4, A5);

LCD::LCD() {
  // initialize the library with the numbers of the interface pins
  lcd.begin(16, 2);
}

void LCD::print(uint8_t row, uint8_t column, char* text)
{
  lcd.setCursor(row, column);
  lcd.print(text);
}
