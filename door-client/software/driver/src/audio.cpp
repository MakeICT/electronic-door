  #include "audio.h"
int notes_array[] = {0,33,35,37,39,41,44,46,49,52,55,58,62,65,69,73,78,82,87,93,98,104,110,117,123,131,139,147,156,165,175,185,196,208,220,233,247,262,277,294,311,330,349,370,392,415,440,466,494,523,554,587,622,659,698,740,784,831,880,932,988,1047,1109,1175,1245,1319,1397,1480,1568,1661,1760,1865,1976,2093,2217,2349,2489,2637,2794,2960,3136,3322,3520,3729,3951,4186,4435,4699,4978};

Audio::Audio(byte pin)  {
  audioPin = pin;
  pinMode(audioPin, OUTPUT);
}

void Audio::SetDebugPort(SoftwareSerial* dbgPort)  {
  this->debugPort = dbgPort;
}

void Audio::Play(struct tune newTune)  {
  //LOG_DEBUG("\r\n");
  //for (int i=0; i<newTune.length; i++)  {    
    //LOG_DEBUG(newTune.notes[i]);
    //LOG_DEBUG("  ");
    //LOG_DEBUG(newTune.durations[i]);
    //LOG_DEBUG("\r\n");
  //}
  this->Play(newTune.notes, newTune.durations, newTune.length);
}

void Audio::Play(byte melody[], byte durations[], byte length)  {
  playing = true;
  currentNoteStartTime = millis();
  noteIndex = 0;
  currentTune.length = length;
  arrayCopy(melody, currentTune.notes, length);
  arrayCopy(durations, currentTune.durations, length);
  tone(audioPin, notes_array[currentTune.notes[noteIndex]], (currentTune.durations[noteIndex]*20));
}

void Audio::Update()  {
  if (playing)  {
    uint32_t currentTime = millis();
    if(currentTime - currentNoteStartTime < (currentTune.durations[noteIndex] * 20)) {
      return;
    }
    else  {
      currentNoteStartTime = currentTime;
      
      if(++noteIndex < currentTune.length)  {
        noTone(audioPin);
        tone(audioPin, notes_array[currentTune.notes[noteIndex]], (currentTune.durations[noteIndex]*20));
      }
      else  {
        noTone(audioPin);
        playing = false;
      }
    }
  }
}
