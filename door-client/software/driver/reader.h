#ifndef READER_H
#define READER_H

#include <Arduino.h>
#include "utils.h"
#include <SoftwareSerial.h>

#include <SPI.h>
#include <PN532_SPI.h>

//TODO: only include if necessary

//#define READER_PN532
//#include "PN532.h"

#define READER_RC522
#include <MFRC522.h>

class Reader {
  public:
    Reader();
    uint8_t poll(uint8_t*, uint8_t*);
    boolean start();
    void SetDebugPort(SoftwareSerial* dbgPort);

  private:
    SoftwareSerial* debugPort;
    bool Initialize();
    bool IsAlive();
};

#endif
