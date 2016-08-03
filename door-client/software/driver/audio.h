
#ifndef AUDIO_H
#define AUDIO_H

#include <Arduino.h>
#include "notes.h"
//#include <NewTone.h>

struct tune  {
  uint8_t length;
  uint8_t* notes;
  uint8_t* durations;
};

class Audio
{
  public:
    Audio(byte);
    void Play(byte melody[], byte durations[], byte length);
    void Update();
    
  private:
    byte audioPin;
    boolean playing;
    uint32_t currentNoteStartTime;
    uint8_t noteIndex;
    uint8_t tuneLength;
    byte* notes;   
    byte* noteLengths;
};
#endif
