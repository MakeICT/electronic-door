#include "reader.h"

void Reader::SetDebugPort(SoftwareSerial* dbgPort)  {
  this->debugPort = dbgPort;
}


#ifdef READER_PN532

#define RESET_PIN 10

PN532_SPI pn532spi(SPI, RESET_PIN);      //TODO: make this configurable
PN532 nfc(pn532spi);

Reader::Reader() {

}

boolean Reader::start() {
  this->Initialize();
}

bool Reader::Initialize()  {
  LOG_DEBUG(F("Initializing PN532 NFC reader\r\n"));
  for (int i=0; i<3; i++)  {
    if (i==2)  {
      //Do a hard reset on 3rd attempt.  Maybe it will help?
      LOG_DEBUG(F("Failed to initialize reader 2 times. Commencing hard reset.\r\n"));
      digitalWrite(RESET_PIN, 0);
      delay(1000);
      digitalWrite(RESET_PIN, 1);
      delay(100);
    }
    nfc.begin();
    if (this->IsAlive())  {
      //configure board to read RFID tags
      nfc.SAMConfig();
      nfc.setPassiveActivationRetries(2);  //reduce retries to prevent hang
      LOG_DEBUG(F("Reader initialized successfully\r\n"));
      return true;
    }
  }
  LOG_ERROR(F("Could not initialize reader\r\n"));
  return false;
  //TODO: implement self-test if available.
}

bool Reader::IsAlive()  {
  uint32_t v = nfc.getFirmwareVersion();
  if (!v) {
    return false;
  }
  else  {
    return true;
  }
}

uint8_t Reader::poll(uint8_t uid[], uint8_t* len)
{
  // Check if reader is still working
  if (!this->IsAlive())  {
    LOG_ERROR(F("NFC Reader has stopped responding\r\n"));
    if (!this->Initialize())  {
      return 2;
    }
  }
  //TODO: detect if reader is still functioning correctly; if not, reset
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

boolean Reader::start() {
  //TODO: add reader detection

  SPI.begin();        // Init SPI bus
  return this->Initialize();
}

bool Reader::Initialize()  {
  LOG_DEBUG(F("Initializing MFRC522 NFC reader\r\n"));
  for (int i=0; i<3; i++)  {
    mfrc522.PCD_Init();
    if (this->IsAlive())  {
      //break;
      LOG_DEBUG(F("Reader initialized successfully\r\n"));
      return true;
    }
  }
  LOG_ERROR(F("Could not initialize reader\r\n"));
  return false;
  // Self-test always fails.  Possibly due to counterfeit chips
  //~ if (!mfrc522.PCD_PerformSelfTest())  {
    //~ LOG_ERROR("MFRC522 self-test failed!");      //Failure should produce user-visible output
    //~ return false;
  //~ }
  //~ else  {
    //~ LOG_DEBUG("MFRC522 self-test passed");
    //~ return true;
  //~ }
}

bool Reader::IsAlive()  {
  byte v = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  if ((v == 0x00) || (v == 0xFF)) {
    return false;
  }
  else  {
    return true;
  }
}

uint8_t Reader::poll(uint8_t uid[], uint8_t* len)
{
  // Check if reader is still working
  if (!this->IsAlive())  {
    LOG_ERROR(F("NFC Reader has stopped responding\r\n"));
    if (!this->Initialize())  {
      return false;
    }
  }
  // Look for new cards
  if (mfrc522.PICC_IsNewCardPresent())  {
    LOG_DEBUG(F("New NFC card detected\r\n"));
    // Select one of the cards
    if (mfrc522.PICC_ReadCardSerial())  {
      LOG_DEBUG(F("Successfully read card serial\r\n"));
      // Show some details of the PICC (that is: the tag/card)
      for (byte i = 0; i < mfrc522.uid.size; i++) {
        uid[i] = mfrc522.uid.uidByte[i];
      }
      //identify picctype
      //byte piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
      return true;
    }
    else  {
      LOG_ERROR(F("Failed to read card UID!\r\n"));
    }
  }
  return false;
}
#endif
 
 
