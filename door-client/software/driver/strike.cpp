#include "strike.h"

Strike::Strike(byte pin)  {
  strikePin = pin;
  pinMode(strikePin, OUTPUT);
}

void Strike::Lock()  {
  digitalWrite(strikePin, LOW);
}

void Strike::Unlock(uint16_t duration)  {
  unlockTime = millis();
  unlockDuration = duration;
  digitalWrite(strikePin, HIGH);
}

void Strike::Update()  {
  //TODO: use PWM to decrease power when holding lock open
  if (unlockDuration > 0)  {
    uint32_t currentTime = millis();
    if (currentTime - unlockTime > unlockDuration)  {
      Lock();
      unlockDuration = 0;
    }
  }
}

