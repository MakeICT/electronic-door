#include "audio.h"

Audio::Audio(byte pin)  {
  audioPin = pin;
  pinMode(audioPin, OUTPUT);
}

void Audio::Play(int melody[], uint16_t durations[], uint8_t length)  {
  currentNoteStartTime = millis();
  noteIndex = 0;
  notes = melody;
  noteLengths = durations;
  tuneLength = length;
  tone(audioPin, notes[noteIndex], noteLengths[noteIndex]);
}

void Audio::Update()  {
  uint32_t currentTime = millis();
  if(currentTime - currentNoteStartTime < noteLengths[noteIndex]+30) {
    return;
  }
  else  {
    currentNoteStartTime = currentTime;
    if(++noteIndex < tuneLength)  {
      tone(audioPin, notes[noteIndex], noteLengths[noteIndex]);
    }
  }
}

