#ifndef RING_H
#define RING_H

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>

#ifdef __AVR__
  #include <avr/power.h>
#endif

class Ring {
  public:
    Ring(uint8_t, uint8_t);
    ~Ring();
    void lightSolid(int, int, int);
    void Green(int);

  private:
    uint8_t num_LEDs;
    uint8_t pin;
    Adafruit_NeoPixel pixels;
};

#endif
