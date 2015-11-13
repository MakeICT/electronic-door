#include "reader.h"

#define SCK  (2)
#define MOSI (3)
#define SS   (4)
#define MISO (5)

PN532_SPI pn532spi(SPI, 10);
PN532 nfc(pn532spi);

Reader::Reader() {

}

Reader::~Reader() {
  
}

boolean Reader::start() {
  //nfc(SCK, MISO, MOSI, SS);    //software SPI connection
  //nfc = new Adafruit_PN532(sck, miso, mosi, ss); //this?

  nfc.begin();
  digitalWrite(13,1);

  uint32_t versiondata = nfc.getFirmwareVersion();
  if (! versiondata) {
    Serial.println("PN532 Not Found!");
    return false;
  }
  
  //configure board to read RFID tags
  nfc.SAMConfig();
  nfc.setPassiveActivationRetries(2);  //reduce retries to prevent hang
  return true;
}



uint8_t Reader::poll(uint8_t uid[], uint8_t* len)
{
  uint8_t success;
  for (int i = 0; i <8; i++)
    uid[i] = 0;  // Buffer to store the returned UID
  uint8_t uidLength;                        // Length of the UID 
 
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, &uid[0], &uidLength, 50);
  if (success)
  {
      Serial.println("read done");

    if (uidLength == 4)  {
      // We probably have a Mifare Classic card ... 
      Serial.print("Seems to be a Mifare Classic card #");
    }
  
    else if (uidLength == 7)  {
      Serial.print("Seems to be a Mifare Ultralight card #");
    }
    
    return 1;
  } 
  else return 0;
}
 
 
