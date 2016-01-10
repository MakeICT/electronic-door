#include "strike.h"

Strike::Strike(byte sPin)  {
  strikePin = sPin;
  pinMode(strikePin, OUTPUT);
}

void Strike::Lock()  {
  analogWrite(strikePin, 0);
}

void Strike::Unlock(uint16_t duration)  {
  unlockTime = millis();
  unlockDuration = duration;
  analogWrite(strikePin, 1023);
}

void Strike::Update()  {
  if (unlockDuration > 0)  {
    uint32_t currentTime = millis();
    if (currentTime - unlockTime > STRIKE_HIGH_TIME)  {
      analogWrite(strikePin, HOLD_DUTY_CYCLE);
    }
    if (currentTime - unlockTime > unlockDuration)  {
      Lock();
      unlockDuration = 0;
    }
  }
}

