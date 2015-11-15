#define DEBUG

/*-----( Import needed libraries )-----*/
#include <SoftwareSerial.h>
//#include <Wire.h>
#include <SPI.h>
#include <LiquidCrystal.h>
#include <Adafruit_NeoPixel.h>
#include <EEPROM.h>
#include <PN532_SPI.h>
#include "PN532Interface.h"

#include "ring.h"
#include "reader.h"
#include "rs485.h"
#include "lcd.h"
#include "audio.h"
#include "strike.h"

/*-----( Declare Constants and Pin Numbers )-----*/
#define SPEAKER_PIN 9
#define LATCH_PIN   3
#define USER_TUNE_LENGTH  30

//Serial protocol definitions
#define SSerialRX        6      //Serial Receive pin
#define SSerialTX        7      //Serial Transmit pin
#define SSerialTxControl 8      //RS485 Direction control

//Constants for PN532 NFC reader
#define PN532_SS   10
#define NFC_READ_INTERVAL 100   //time in ms between NFC reads

//Constants for NeoPixel ring
#define PIN            2        //Pin communicating with NeoPixel Ring
#define NUMPIXELS      16       //Number of NeoPixels in Ring

#define COLOR               Adafruit_NeoPixel::Color
#define COLOR_IDLE          0,100,120
#define COLOR_SUCCESS       0,60,20
#define COLOR_ERROR         50,20,0
#define COLOR_BACKGROUND    0,20,50


/*-----( Declare objects )-----*/
Reader card_reader;
rs485 bus(SSerialRX, SSerialTX, SSerialTxControl);
Ring status_ring(PIN, NUMPIXELS);
LCD readout;
Audio speaker(SPEAKER_PIN);

/*-----( Declare Variables )-----*/
uint8_t byteReceived;
uint8_t packet[255];  //this could be made dynamic?
uint8_t packetIndex;

int startTune[] = {NOTE_C4, NOTE_G3, NOTE_G3, NOTE_A3, NOTE_G3, 0, NOTE_B3, NOTE_C4};    
uint16_t startTuneDurations[] = {200, 100, 100, 200, 200, 200, 200, 200};
int userTune[USER_TUNE_LENGTH];
int userTuneDurations[USER_TUNE_LENGTH];

/*-----( Declare Functions )-----*/
uint8_t* nfc_poll();
void save_address(uint8_t addr);
uint8_t get_address();
void check_reader();
void check_bus();
void update_lights();
void update_sound();


void setup(void) {  
  readout.print(0,0, "Initializing...");
  Serial.begin(115200);
  Serial.println("setup()");
  if(!card_reader.start())  {
    readout.print(0,1,"ERROR: NFC");
    status_ring.SetMode(M_FLASH, COLOR(COLOR_ERROR), 100, 0);
  }
  else  {
    readout.print(0,1, "Ready!");
  }
  pinMode(3, OUTPUT);
  status_ring.SetBackground(COLOR(COLOR_BACKGROUND));
  status_ring.SetMode(M_CHASE, COLOR(COLOR_IDLE), 100 , 0);
  speaker.Play(startTune, startTuneDurations, 8);
}


void loop(void) {
 // Serial.println("loop()");
  static uint32_t lastRead = 0;
  uint32_t currentMillis = millis();
  if ((currentMillis - lastRead )> NFC_READ_INTERVAL)  {
    check_reader();
    lastRead = currentMillis;
  }
  check_bus();
  update_lights();
  update_sound();
}

void check_reader()  {
  //check for NFC card
  uint8_t uid[7];
  uint8_t id_length;
  if(card_reader.poll(uid, &id_length))  {
    if (uid[0]+uid[1]+uid[2]+uid[3] != 0)  {
      status_ring.SetMode(M_FLASH,COLOR(COLOR_SUCCESS),200, 3000);
      update_lights();
      bus.send_packet(0x01, 0x00, F_SEND_ID, uid, 7); 
    }
  }
}

void check_bus()  {
  //check for data on the rs485 bus
  for (int i = bus.available(); i > 0; i--)  {
    byteReceived = bus.receive();    // Read received byte
//    Serial.println(byteReceived);
    if(byteReceived == FLAG)  {
      packetIndex = 0;
      //TODO: verify packet integrity
      //TODO: check addresses
      uint8_t length = packet[0];
      uint8_t src_address = packet[1];
      uint8_t dst_address = packet[2];
      uint8_t function = packet[3];
//      
//      //Display packet info
//      Serial.print("length: ");
//      Serial.println(length);
//      Serial.print("source address: ");
//      Serial.println(src_address);
//      Serial.print("destination address: ");
//      Serial.println(dst_address);
//      Serial.print("function: ");
//      Serial.println(function);
//      Serial.print("data: ");
//      for(uint8_t i = 4; i < length; i++)  {
//         Serial.print(packet[i]);
//         Serial.print(',');
//      }
//      Serial.println(' ');
      
      //Process functions
      switch(function)
      {
        case F_UNLOCK_DOOR:
          //TODO: add non-blocking timeout
          digitalWrite(LATCH_PIN, HIGH);
          break;
        case F_LOCK_DOOR:
          digitalWrite(LATCH_PIN, LOW);
          break;
      }
    }
    else  {
      packet[packetIndex++] = byteReceived; 
    }   
  } 
}

void update_sound()  {
  speaker.Update();
}

void update_lights()  {
  status_ring.Update();
}

void save_address(uint8_t addr)  {
  EEPROM.write(0, addr);
}

uint8_t get_address()  {
  EEPROM.read(0);
}

