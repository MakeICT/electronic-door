#include "reader.h"



bool Reader::init() {
    mfrc522.PCD_Init();     // Init MFRC522
    mfrc522.PCD_DumpVersionToSerial();  // Show details of PCD - MFRC522 Card Reader details
    ESP_LOGD(LOG_TAG, "Scan PICC to see UID, SAK, type, and data blocks...");
    return true;
}


uint8_t Reader::poll(uint8_t* uid) {
    // Look for new cards
    if ( ! mfrc522.PICC_IsNewCardPresent()) {
        return 0;
    }
    ESP_LOGD(LOG_TAG, "NEW CARD");

    // Select one of the cards
    if ( ! mfrc522.PICC_ReadCardSerial()) {
        return 0;
    }
    ESP_LOGD(LOG_TAG, "READ SERIAL");
    ESP_LOGD(LOG_TAG, "%d-byte UID", mfrc522.uid.size);
    strncpy((char*) uid, (char*) mfrc522.uid.uidByte, mfrc522.uid.size);
    return(mfrc522.uid.size);
    // // Dump debug info about the card; PICC_HaltA() is automatically called
    // mfrc522.PICC_DumpToSerial(&(mfrc522.uid));
}