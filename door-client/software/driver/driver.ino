/*-----( Import needed libraries )-----*/
#include <SoftwareSerial.h>
#include <Wire.h>
#include <SPI.h>
#include <LiquidCrystal.h>
#include <Adafruit_NeoPixel.h>
#include <EEPROM.h>
//#include <Adafruit_PN532.h>
#include <PN532_SPI.h>
#include "PN532Interface.h"

#include "ring.h"
#include "reader.h"
#include "serial.h"
#include "lcd.h"

/*-----( Declare Constants and Pin Numbers )-----*/

//Serial protocol definitions
#define SSerialRX        6  //Serial Receive pin
#define SSerialTX        7  //Serial Transmit pin
#define SSerialTxControl 8   //RS485 Direction control

//Software SPI pins for PN532
#define PN532_SS   10

//Info for NeoPixel ring
#define PIN            2        //Pin communicating with NeoPixel Ring
#define NUMPIXELS      16       //Number of NeoPixels in Ring

/*-----( Declare objects )-----*/
rs485 bus(SSerialRX, SSerialTX, SSerialTxControl);
Ring status_ring(PIN, NUMPIXELS);
Reader card_reader;
LCD readout;

/*-----( Declare Variables )-----*/
int state;
uint8_t byteReceived;
int byteSend;

/*-----( Declare Functions )-----*/
uint8_t* nfc_poll();
void save_address(uint8_t addr);
uint8_t get_address();

//TEST
//Adafruit_PN532 nfc1(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);

PN532_SPI pn532spi1(SPI, PN532_SS);
PN532 nfc1(pn532spi1);

void setup(void) {
  status_ring.lightSolid(20, 13, 0);
  Serial.begin(115200);
  Serial.println("Hello!");
  Serial.println("Waiting for an ISO14443A Card ...");
  readout.print(0,1, "test");

  //TEST
   nfc1.begin();
   nfc1.SAMConfig();
   nfc1.setPassiveActivationRetries(1);
}


void loop(void) {
  if (Serial.available())
  {
    byteReceived = Serial.read();
    bus.send(&byteReceived);
  }
  
  if (bus.available())  //Look for data from other Arduino
   {
    byteReceived = bus.receive();    // Read received byte
    if(byteReceived == '\n' || byteReceived == '\r')
      Serial.println();
    else {
      Serial.write(byteReceived);        // Show on Serial Monitor
      delay(10);
    } 
   }
   // uint32_t cardid = card_reader.poll();
    Serial.println("Start Poll");
    //uint8_t* cardid = card_reader.poll();
    uint8_t uid[7];
    uint8_t id_length;
    if(nfc_poll(uid, &id_length))
    {
//    Serial.println(uid[0]);
//    Serial.println(uid[1]);
//    Serial.println(uid[2]);
//    Serial.println(uid[3]);
      uint32_t id_number = uid[0];
      id_number <<= 8;
      id_number |= uid[1];
      id_number <<= 8;
      id_number |= uid[2];  
      id_number <<= 8;
      id_number |= uid[3]; 
      bus.send_packet(0x01, 0x00, uid, 1); 
      //uint8_t test_byte = 'c';
      //bus.send(&test_byte);
    }

//    Serial.println(id_number);
   // bus.send(uid);
    Serial.println("End Poll");
    if (uid[0] != 0) {
      //Display some basic information about the card
     // Serial.println(cardid[0]);
  
      
  
      //TODO: send cardid to pi and wait for further instructions
      //bus.send(cardid[0]);
      status_ring.lightSolid(40,30,0);  //change ring to yellow - indicate waiting state
      delay(1000);
      status_ring.lightSolid(20,0,0);
      }
    Serial.println("");
}

void save_address(uint8_t addr)  {
  EEPROM.write(0, addr);
}

uint8_t get_address()  {
  EEPROM.read(0);
}


//workaround because the external file doesn't work right
bool nfc_poll(uint8_t uid[], uint8_t* len)
{
  uint8_t success;
  for (int i = 0; i <8; i++)
    uid[i] = 0;  // Buffer to store the returned UID
  uint8_t uidLength;                        // Length of the UID 
 
  //success = nfc1.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 3000);
  success = nfc1.readPassiveTargetID(PN532_MIFARE_ISO14443A, &uid[0], &uidLength);
    if (success)
    {
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

