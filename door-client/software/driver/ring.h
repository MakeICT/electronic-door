#ifndef RING_H
#define RING_H

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#ifdef __AVR__
  #include <avr/power.h>
#endif

#define M_SAME   0
#define M_SOLID  1
#define M_FLASH  2
#define M_PULSE  3
#define M_CHASE  4

class Ring {
  public:
    Ring(uint8_t, uint8_t);
    void lightAll(uint32_t);
    
    void SetMode(byte m, uint32_t c, int p, int d);
    void SetColor(uint32_t c);
    void SetPeriod(int period);
    void SetBackground(uint32_t c);
    void Update();
    
  private:
    uint8_t num_LEDs;
    uint8_t pin;
    uint8_t mode;
    Adafruit_NeoPixel pixels;
    uint32_t last_change;
    uint32_t color;
    uint32_t color2;
    byte dim[3];
    
    uint16_t period;
    byte index;
    uint8_t state;
    
    uint8_t tempMode;
    uint16_t tempDuration;
    uint32_t tempStarted;
    uint32_t tempColor;
    uint32_t tempColor2;
    byte tempPeriod;
    byte tempIndex;
};

#endif
