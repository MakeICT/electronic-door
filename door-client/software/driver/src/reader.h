#ifndef READER_H
#define READER_H

#include "module.h"
#include <Arduino.h>
#include "definitions.h"
#include "utils.h"
#include <SoftwareSerial.h>

#include <SPI.h>

//#define READER_PN532
#ifdef READER_PN532
#include "PN532.h"
#include <PN532_SPI.h>
#endif

// #define READER_RC522
#ifdef READER_RC522
#include "MFRC522.h"
#endif

class Reader : public Module{
  public:
    bool Init();
    void Update();
    Reader();
    uint8_t poll(uint8_t*, uint8_t*);
    void SetDebugPort(SoftwareSerial* dbgPort);

  private:
    SoftwareSerial* debugPort;
    bool IsAlive();
};

#endif
