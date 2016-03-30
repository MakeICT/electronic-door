#include "lcd.h"

#include <Arduino.h>

SoftwareSerial lcd(16, 4);

LCD::LCD() {
  lcd.begin(9600);
  this->Clear();
  this->Home();
  this->SetContrast(50);
  this->SetBacklight(8);
}

void LCD::SendCommand(uint8_t command) {
  lcd.write(0xFE);
  lcd.write(command);
}

void LCD::Print(char* text) {
  lcd.write(text);
}

void LCD::Home() {
  this->SendCommand(0x46);
}

void LCD::On() {
  this->SendCommand(0x41);
}

void LCD::Off() {
  this->SendCommand(0x42);
}

void LCD::Clear() {
  this->SendCommand(0x51);
}

void LCD::SetCursor(uint8_t pos) {
  this->SendCommand(0x45);
  lcd.write(pos);
}

void LCD::SetBAUD(uint8_t baud) {
  this->SendCommand(0x61);
  lcd.write(baud);
}

void LCD::SetContrast(uint8_t contrast) {
  this->SendCommand(0x52);
  lcd.write(contrast);
}

void LCD::SetBacklight(uint8_t brightness) {
  this->SendCommand(0x53);
  lcd.write(brightness);
}
