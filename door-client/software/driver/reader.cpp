#include "reader.h"

#ifdef READER_PN532

PN532_SPI pn532spi(SPI, 10);      //TODO: make this configurable
PN532 nfc(pn532spi);

Reader::Reader() {

}

boolean Reader::start() {
  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();
  if (! versiondata) {
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
  for (byte i = 0; i <8; i++)
    uid[i] = 0;  // Buffer to store the returned UID
  uint8_t uidLength;                        // Length of the UID 
 
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 50);
  if (success)
  {
    if (uidLength == 4)  {
      // We probably have a Mifare Classic card ... 
    }
  
    else if (uidLength == 7)  {
      // Mifare Ultralight
    }
    
    return 1;
  } 
  else return 0;
}
#endif

#ifdef READER_RC522

MFRC522 mfrc522(10, 3);   // TODO: make this configurable
Reader::Reader() {

}

void Reader::SetDebugPort(SoftwareSerial* dbgPort)  {
  this->debugPort = dbgPort;
}


boolean Reader::start() {
  //TODO: add reader detection

  SPI.begin();        // Init SPI bus
  mfrc522.PCD_Init(); // Init MFRC522 reader
  byte versiondata = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  if (!versiondata) {
    return false;
  }
  return true;
}

uint8_t Reader::poll(uint8_t uid[], uint8_t* len)
{
  // Look for new cards
  if (mfrc522.PICC_IsNewCardPresent())  {
    // Select one of the cards
    if (mfrc522.PICC_ReadCardSerial())  {
      // Show some details of the PICC (that is: the tag/card)
      for (byte i = 0; i < mfrc522.uid.size; i++) {
        uid[i] = mfrc522.uid.uidByte[i];
      }
      //identify picctype
      //byte piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
      return 1;
    }
  }
}
#endif
 
 
