/*-----( Import needed libraries )-----*/
#include <SoftwareSerial.h>
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
// Pin assignments
#define RING_PIN          2       // Pin communicating with NeoPixel Ring
#define PN532_SS_PIN      10      // SPI Slave Select pin
#define SPEAKER_PIN       9       // Tone generation pin
#define LATCH_PIN         5       // Digital pin to trigger door strike circuit
#define SSerialRX         6       // Serial Receive pin
#define SSerialTX         7       // Serial Transmit pin
#define SSerialTxControl  8       // RS485 Direction control
#define DOOR_SWITCH_PIN   A0      // Magnetic switch on door
#define ALARM_BUTTON_PIN  A1      // Big button to arm the alarm

// Constants for RS485
#define MAX_PACKET_SIZE   100

// Constants for audio playback
#define USER_TUNE_LENGTH  30      // Max number of notes in entry melody

// Constants for PN532 NFC reader
#define NFC_READ_INTERVAL 100     // time in ms between NFC reads
#define ID_SEND_INTERVAL  1000    // time in ms between sending card IDs

// Constants for NeoPixel ring
#define NUMPIXELS         16      // Number of NeoPixels in Ring
#define COLOR               Adafruit_NeoPixel::Color
#define COLOR_IDLE          0,100,120
#define COLOR_SUCCESS       0,60,20
#define COLOR_ERROR         50,20,0
#define COLOR_BACKGROUND    0,20,50


/*-----( Declare objects )-----*/
Reader card_reader;
rs485 bus(SSerialTxControl);
Ring status_ring(RING_PIN, NUMPIXELS);
LCD readout;
Audio speaker(SPEAKER_PIN);
Strike door_latch(LATCH_PIN);

/*-----( Declare Variables )-----*/
uint8_t byteReceived;
uint8_t address;
boolean alarmButton = 0;
boolean doorState = 0;
uint32_t lastIDSend = 0;
byte packet[MAX_PACKET_SIZE];
//TODO: store start tune and other settings in EEPROM, make configurable
byte startTune[] = {NOTE_C4, NOTE_G3, NOTE_G3, NOTE_A3, NOTE_G3, 0, NOTE_B3, NOTE_C4};    
byte startTuneDurations[] = {12, 6, 6, 12, 12, 12, 12, 12};
byte userTune[USER_TUNE_LENGTH];
byte userTuneDurations[USER_TUNE_LENGTH];

/*-----( Declare Functions )-----*/
uint8_t* nfc_poll();
void save_address(uint8_t addr);
uint8_t get_address();
void check_reader();
void check_inputs();

SoftwareSerial debugPort(6,7);

void setup(void) {
  debugPort.begin(9600);
  Serial.begin(9600);
  debugPort.println("Start Program");
    bus.SetDebugPort(&debugPort);
  pinMode(DOOR_SWITCH_PIN, INPUT_PULLUP);
  pinMode(ALARM_BUTTON_PIN, INPUT_PULLUP);
  save_address(0x01);
  address = get_address();
  debugPort.print("Address: ");
  debugPort.println(address);
  readout.print(0,0, "Initializing...");
  if(!card_reader.start())  {
    readout.print(0,1,"ERROR: NFC");
    status_ring.SetMode(M_FLASH, COLOR(COLOR_ERROR), 100, 0);
  }
  else  {
    readout.print(0,1, "Ready!");
  }
  status_ring.SetBackground(COLOR(COLOR_BACKGROUND));
  status_ring.SetMode(M_CHASE, COLOR(COLOR_IDLE), 100 , 0);
  speaker.Play(startTune, startTuneDurations, 8);
}


void loop(void) {
  static uint32_t lastRead = 0;
  uint32_t currentMillis = millis();
  if ((currentMillis - lastRead ) > NFC_READ_INTERVAL &&
      (currentMillis - lastIDSend) > ID_SEND_INTERVAL)  {
    check_reader();
    lastRead = currentMillis;
  }
  check_inputs(); 
  speaker.Update();
  status_ring.Update();
  door_latch.Update();
  //TODO: check for connection to Master
  process_packet(address);
}

void check_reader()  {
  //check for NFC card
  uint8_t uid[7];
  uint8_t id_length;
  if(card_reader.poll(uid, &id_length))  {
    bus.send_packet(0x01, 0x00, F_SEND_ID, uid, 7);
    lastIDSend = millis();

    //TEMPORARY TEST CODE
    status_ring.SetMode(M_FLASH, COLOR(COLOR_SUCCESS), 200, 3000);
    door_latch.Unlock(3000);
    speaker.Play(startTune, startTuneDurations, 8);
  }
}

void process_packet(uint8_t dev_addr)  {
  if (bus.get_packet(dev_addr, packet))  {
    uint8_t length = packet[0];
    uint8_t src_address = packet[1];
    uint8_t dst_address = packet[2];
    uint8_t function = packet[3];
    uint16_t CRC = packet[length-2] << 8 + packet[length-1];
      //#define DEBUG1
      #ifdef DEBUG1
      //Display packet info
      debugPort.print("length: ");
      debugPort.println(length);
      debugPort.print("source address: ");
      debugPort.println(src_address);
      debugPort.print("destination address: ");
      debugPort.println(dst_address);
      debugPort.print("function: ");
      debugPort.println(function);
      debugPort.print("data: ");
      for(uint8_t i = 4; i < length -2; i++)  {
        debugPort.print(packet[i]);
        debugPort.print(',');
      }
      debugPort.println(' ');
      #endif

    //Process functions
    switch(packet[3])
    {
      case F_UNLOCK_DOOR:
        door_latch.Unlock(packet[4] * 1000);
        break;
      case F_LOCK_DOOR:
        door_latch.Lock();
        break;
      case F_PLAY_TUNE:
        //debugPort.println("play entry tune");

        byte tune_length = (length - 6)/2;
        //debugPort.println(tune_length);
        for(byte i = 0; i < tune_length; i++)  {
          //debugPort.println(packet[i+4]);
          userTune[i] = packet[i + 4];
        }
        for(byte i = 0; i < tune_length; i++)  {
          userTuneDurations[i] = packet[i + 4 + tune_length];
          //debugPort.println(packet[i+4 + tune_length]);
        }
        speaker.Play(userTune, userTuneDurations, tune_length);   
   
    }
  }
}

void check_inputs()  {
  if(digitalRead(ALARM_BUTTON_PIN) != alarmButton)  {
    alarmButton = !alarmButton;
    byte payload[1] = {alarmButton};
    bus.send_packet(address, ADDR_MASTER, F_ALARM_BUTTON, payload, 1);
  }
    
  if(digitalRead(DOOR_SWITCH_PIN) != doorState)  {
    doorState = !doorState;
    byte payload[1] = {doorState};
    bus.send_packet(address, ADDR_MASTER, F_DOOR_STATE, payload, 1);
  }
}

void save_address(uint8_t addr)  {
  EEPROM.update(0, addr);
}

uint8_t get_address()  {
  return EEPROM.read(0);
}

