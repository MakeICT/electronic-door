#include "reader.h"

#ifdef READER_PN532
PN532_SPI pn532spi(SPI, NFC_SS_PIN);
PN532 nfc(pn532spi);
#endif

#ifdef READER_RC522
MFRC522 mfrc522(NFC_SS_PIN, NFC_RESET_PIN );
#endif

void Reader::SetDebugPort(SoftwareSerial* dbgPort)  {
  this->debugPort = dbgPort;
}

Reader::Reader() {
}

boolean Reader::start() {
  //TODO: add reader detection?
  #ifdef READER_RC522
  SPI.begin();      //init SPI bus
  #endif
  return this->Initialize();
}

bool Reader::Initialize()  {
  LOG_DEBUG(F("Initializing NFC reader: "));
  #ifdef READER_PN532
  LOG_DEBUG(F("PN532\r\n"));
  #endif
  #ifdef READER_RC522
  LOG_DEBUG(F("MFRC522\r\n"));
  #endif

  for (int i=1; i<4; i++)  {
    LOG_DEBUG(F("Initialization attempt: "));
    LOG_DEBUG(i);
    LOG_DEBUG(F("\r\n"));
    if (i==3)  {
      //Do a hard reset on 3rd attempt.  Maybe it will help?
      LOG_DEBUG(F("Failed to initialize reader 2 times. Commencing hard reset.\r\n"));
      digitalWrite(NFC_RESET_PIN, 0);
      #ifdef READER_RC522
      SPI.end();
      SPI.begin();
      #endif
      delay(100);   //longer than necessary
      digitalWrite(NFC_RESET_PIN, 1);
      delay(100);
    }
    #if defined(READER_RC522)
    mfrc522.PCD_Init();
    #elif defined(READER_PN532)
    nfc.begin();
    #else
    LOG_DEBUG(F("No reader specified!\r\n"));
    return false;
    #endif
    if (this->IsAlive())  {
      #ifdef READER_PN532
      //configure board to read RFID tags
      nfc.SAMConfig();
      nfc.setPassiveActivationRetries(2);  //reduce card read retries to prevent hang
      #endif
      LOG_DEBUG(F("Reader initialized successfully\r\n"));
      return true;
    }
    else  {
      LOG_DEBUG(F("Failed to initialise reader\r\n"));
    }
  }
  LOG_ERROR(F("Could not initialize reader after 3 attempts\r\n"));
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
  #ifdef READER_PN532
  uint32_t v = nfc.getFirmwareVersion();
  if (!v)
  #endif

  #ifdef READER_RC522
  byte v = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  if ((v == 0x00) || (v == 0xFF))
  #endif
  {
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
  for (byte i = 0; i <8; i++)
    uid[i] = 0;  // Buffer to store the returned UID

  #if defined(READER_PN532)
  //uint8_t uidLength;                        // Length of the UID
  uint8_t success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, len, 50);
  if (success)
  {
    if (len == 4)  {
      // We probably have a Mifare Classic card ...
    }

    else if (len == 7)  {
      // Mifare Ultralight
    }
    LOG_DEBUG(F("Successfully read card serial\r\n"));
    return 1;
  }
  #elif defined(READER_RC522)
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
      *len = mfrc522.uid.size;
      //identify picctype
      //byte piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
      return 1;
    }
    else  {
      LOG_ERROR(F("Failed to read card UID!\r\n"));
      return 0;
    }
  }
  #endif
  else return 0;
}
