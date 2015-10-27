#include "reader.h"

#define SCK  (2)
#define MOSI (3)
#define SS   (4)
#define MISO (5)

//PN532_SPI pn532spi(SPI, 10);
//PN532 nfc(pn532spi);

Reader::Reader() {
  //nfc(SCK, MISO, MOSI, SS);    //software SPI connection
  //nfc = new Adafruit_PN532(sck, miso, mosi, ss);

 // nfc.begin();
  //digitalWrite(13,1);

  //uint32_t versiondata = nfc.getFirmwareVersion();
//  if (! versiondata) {
//    while (1); // halt
//  }
//  
  // configure board to read RFID tags
  //nfc.SAMConfig();
}

Reader::~Reader() {
  
}

uint8_t Reader::poll() {
//boolean success;
//  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
//  uint8_t uidLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)
//  
//  // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
//  // 'uid' will be populated with the UID, and uidLength will indicate
//  // if the uid is 4 bytes (Mifare Classic) or 7 bytes (Mifare Ultralight)
//  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, &uid[0], &uidLength);
//  
//  if (success) {
////    Serial.println("Found a card!");
////    Serial.print("UID Length: ");Serial.print(uidLength, DEC);Serial.println(" bytes");
////    Serial.print("UID Value: ");
////    for (uint8_t i=0; i < uidLength; i++) 
////    {
////      Serial.print(" 0x");Serial.print(uid[i], HEX); 
////    }
////    Serial.println("");
////    Serial.println(value);
//
//    // Wait 1 second before continuing
//    return uid[0];
//    //delay(1000);
//  }
//  else
//  {
//    // PN532 probably timed out waiting for a card
//    //Serial.println("Timed out waiting for a card");
//    return 0;
//  }
//  
 }
 
 
