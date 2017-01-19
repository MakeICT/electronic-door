
#ifndef AUDIO_H
#define AUDIO_H

#include <Arduino.h>
#include <SoftwareSerial.h>
#include "definitions.h"
#include "utils.h"
#include "notes.h"
//#include <NewTone.h>

struct tune  {
  uint8_t length;
  uint8_t notes[30];
  uint8_t durations[30];
};

class Audio
{
  public:
    Audio(byte);
    void SetDebugPort(SoftwareSerial* dbgPort);
    void Play(struct tune newTune);
    void Play(byte melody[], byte durations[], byte length);
    void Update();

  private:
    SoftwareSerial* debugPort;
    byte audioPin;
    boolean playing;
    uint32_t currentNoteStartTime;
    uint8_t noteIndex;
    struct tune currentTune;
};
#endif
