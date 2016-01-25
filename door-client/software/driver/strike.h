#ifndef STRIKE_H
#define STRIKE_H

#include <Arduino.h>
#include "utils.h"

#define STRIKE_HIGH_TIME  2000
#define HOLD_DUTY_CYCLE   800

class Strike  {
  public:
    Strike(byte sPin);
    void Lock();
    void Unlock(uint16_t duration = 0);
    void Update();
  private:
    byte strikePin;
    bool locked;
    uint32_t unlockTime;
    uint32_t unlockDuration;    
};

#endif
