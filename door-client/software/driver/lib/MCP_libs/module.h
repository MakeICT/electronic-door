#ifndef MODULE
#define MODULE

#include <Arduino.h>
#include <SoftwareSerial.h>
#include "definitions.h"
#include "utils.h"

class Module {
  public:
    void SetDebugPort(SoftwareSerial*);
    bool Init();
    void Update();

  private:
    SoftwareSerial* debugPort;
};

#endif
