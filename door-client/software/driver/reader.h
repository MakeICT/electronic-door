#ifndef READER_H
#define READER_H

#include <Arduino.h>
#include "utils.h"
#include <SoftwareSerial.h>

#include <SPI.h>
#include <PN532_SPI.h>
#include <MFRC522.h>    //TODO: only include if necessary
#include "PN532.h"

#define READER_PN532
//#define READER_RC522


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
