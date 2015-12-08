#ifndef STRIKE_H
#define STRIKE_H

#include <Arduino.h>

class Strike  {
  public:
    Strike(byte pin);
    void Lock();
    void Unlock(uint16_t duration = 0);
    void Update();
  private:
    byte strikePin;
    uint32_t unlockTime;
    uint32_t unlockDuration;    
};

#endif
