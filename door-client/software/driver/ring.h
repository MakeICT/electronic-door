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
#define M_HEART  5

#define COLOR    Adafruit_NeoPixel::Color

class Ring {
  public:
    Ring(uint8_t, uint8_t);
    void lightAll(uint32_t);
    
    void SetMode(struct lightMode newMode);
    void SetMode(byte m, uint32_t c1, uint32_t c2, int p, int d);
    void Solid(uint32_t c, int d);
    void Flash(uint32_t c1, uint32_t c2, int p, int d); 
    void Pulse(uint32_t c, int p, int d);
    void Chase(uint32_t c1, uint32_t c2, int p, int d);
    void Heart(uint32_t c, int p, int d);
    void SetColor1(uint32_t c);
    void SetColor2(uint32_t c);
    void SetPeriod(int period);
    void Update();
    
  private:
    uint8_t num_LEDs;
    uint8_t pin;
    uint8_t mode;
    Adafruit_NeoPixel pixels;
    uint32_t last_change;
    uint32_t color1;
    uint32_t color2;
    byte dim[3];
    
    uint16_t period;
    byte index;
    uint8_t state;
    
    uint8_t tempMode;
    uint16_t tempDuration;
    uint32_t tempStarted;
    uint32_t tempColor1;
    uint32_t tempColor2;
    byte tempPeriod;
    byte tempIndex;
};

struct lightMode  {
  uint8_t mode;
  uint32_t color1;
  uint32_t color2;
  uint16_t period;
  uint16_t duration;
};


#endif
