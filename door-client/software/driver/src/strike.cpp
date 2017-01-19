#include "strike.h"

Strike::Strike(byte sPin)  {
  strikePin = sPin;
  pinMode(strikePin, OUTPUT);
  this->locked = true;
}

void Strike::Lock()  {
  analogWrite(strikePin, 0);
  this->locked = true;
  this->holdingOpen = false;
}

void Strike::Unlock(uint16_t duration)  {
  if (duration == 0)  {
    this->holdingOpen = true;
  }
  unlockTime = millis();
  unlockDuration = duration;
  analogWrite(strikePin, 1023);
  this->locked = false;
}

bool Strike::Locked()  {
  return this->locked; 
}

bool Strike::HoldingOpen()  {
  return this->holdingOpen; 
}

void Strike::Update()  {
  uint32_t currentTime = millis();

  if (!this->locked)  {
    if (currentTime - unlockTime > STRIKE_HIGH_TIME)  {
        analogWrite(strikePin, HOLD_DUTY_CYCLE);
      }
    if (unlockDuration > 0)  {
      if ((currentTime - unlockTime)/1000 > unlockDuration)  {
        Lock();
        unlockDuration = 0;
      }
    }
  }
}

