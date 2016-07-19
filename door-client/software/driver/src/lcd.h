#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include <SoftwareSerial.h>

//Pin definitions

class LCD
{
  public:
    LCD();
    void SendCommand(uint8_t command);
    void Print(const char* text);
    void Home();
    void On();
    void Off();
    void Clear();
    void SetCursor(uint8_t pos);
    void SetBAUD(uint8_t baud);
    void SetContrast(uint8_t contrast);
    void SetBacklight(uint8_t brightness);
};


#endif
