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
    ~Ring();
    void lightAll(int, int, int);
    void Green(int);
    
    void SetMode(byte m, byte c[], int p, int d);
    void SetColor(uint8_t r, uint8_t g, uint8_t b);
    void SetPeriod(int period);
    void SetBackground(byte r, byte g, byte b);
    void Update();

  private:
    uint8_t num_LEDs;
    uint8_t pin;
    uint8_t mode;
    Adafruit_NeoPixel pixels;
    long last_change;
    uint8_t color[3];
    byte color2[3];
    byte dim[3];
    
    int period;
    byte index;
    uint8_t state;
    
    uint8_t tempMode;
    long tempDuration;
    long tempStarted;
    byte tempColor[3];
    byte tempColor2[3];
    byte tempPeriod;
    byte tempIndex;
};

#endif
