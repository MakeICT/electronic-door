#ifndef READER_H
#define READER_H

#include <Arduino.h>

#include <SPI.h>
#include <PN532_SPI.h>
#include "PN532.h"



class Reader {
  public:
    Reader();
    uint8_t poll(uint8_t*, uint8_t*);
    boolean start();

  private:
    //Adafruit_PN532* nfc;
};

#endif
