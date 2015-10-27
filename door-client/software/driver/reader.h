#ifndef READER_H
#define READER_H

#include <Arduino.h>

#include <SPI.h>
#include <PN532_SPI.h>
#include "PN532.h"



class Reader {
  public:
    Reader();
    ~Reader();
    uint8_t poll();

  private:
    //Adafruit_PN532* nfc;
};

#endif
