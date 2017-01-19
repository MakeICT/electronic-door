#ifndef STRIKE_H
#define STRIKE_H

#include <Arduino.h>
#include "definitions.h"
#include "utils.h"

#define STRIKE_HIGH_TIME  1000
#define HOLD_DUTY_CYCLE   1023

class Strike  {
  public:
    Strike(byte sPin);
    void Lock();
    void Unlock(uint16_t duration = 0);
    void Update();
    bool Locked();
    bool HoldingOpen();
  private:
    byte strikePin;
    bool locked;
    bool holdingOpen;
    uint32_t unlockTime;
    uint32_t unlockDuration;
};

#endif
