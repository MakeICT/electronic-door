#ifndef MODULE
#define MODULE

#include <Arduino.h>
#include <SoftwareSerial.h>
#include "definitions.h"
#include "utils.h"

class Module {
  public:
    void SetDebugPort(SoftwareSerial*);
    virtual bool Init()=0;
    virtual void Update()=0;
    bool initialized=false;

  private:
    SoftwareSerial* debugPort;
};

#endif
