#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include <LiquidCrystal.h>

//Pin definitions

class LCD
{
  public:
    LCD();
    ~LCD();
    void print(uint8_t, uint8_t, char[]);
  private:
    //LiquidCrystal lcd;
};

#endif
