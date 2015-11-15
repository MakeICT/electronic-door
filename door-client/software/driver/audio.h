
#ifndef AUDIO_H
#define AUDIO_H

#include <Arduino.h>
#include "notes.h"
//#include <NewTone.h>

class Audio
{
  public:
    Audio(byte);
    void Play(int melody[], uint16_t durations[], uint8_t length);
    void Update();
    
  private:
    byte audioPin;
    boolean playing;
    uint32_t currentNoteStartTime;
    uint8_t noteIndex;
    uint8_t tuneLength;
    int* notes;   
    uint16_t* noteLengths;
};
#endif
