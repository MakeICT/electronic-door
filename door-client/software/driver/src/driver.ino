/*-----( Include needed libraries )-----*/
#include <Arduino.h>
#include <SoftwareSerial.h>
#include <SPI.h>
#include <LiquidCrystal.h>
#include <Adafruit_NeoPixel.h>
#include <EEPROM.h>
#include <PN532_SPI.h>
#include <MFRC522.h>    //TODO: only include if necessary
#include "PN532Interface.h"

/*-----( Include project files )-----*/
#include "packetqueue.h"
#include "ring.h"
#include "reader.h"
#include "rs485.h"
#include "lcd.h"
#include "audio.h"
#include "strike.h"
#include "config.h"
#include "superserial.h"
#include "utils.h"

/*-----( Specify Available Features )-----*/
//moved to makefile
//#define MOD_SERIAL
//#define MOD_LIGHT_RING
//#define MOD_LATCH
//#define MOD_ALARM_BUTTON
//#define MOD_DOOR_SWITCH
//#define MOD_NFC_READER
////#define MOD_DOORBELL
//#define MOD_CHIME
//#define MOD_LCD


/*-----( Declare Constants and Pin Numbers )-----*/

// Pin assignments
#define RS485_RX          0       // Reserved for hardware serial
#define RS485_TX          1       // Reserved for hardware serial
#define RING_PIN          2       // Pin communicating with NeoPixel Ring
#define NFC_RESET_PIN     3       // Pin to reset RC522 NFC module
#define LCD_SERIAL_TX     4       // Serial data for LCD
#define LATCH_PIN         5       // Digital pin to trigger door strike circuit
#define SSerialRX         6       // Debug Serial Receive pin
#define SSerialTX         7       // Debug Serial Transmit pin
#define SSerialTxControl  8       // RS485 Direction control
#define SPEAKER_PIN       9       // Tone generation pin
#define PN532_SS_PIN      10      // SPI Slave Select pin
#define NFC_SPI_1         11      // Reserved for hardware SPI for NFC reader
#define NFC_SPI_2         12      // Reserved for hardware SPI for NFC reader
#define NFC_SPI_3         13      // Reserved for hardware SPI for NFC reader
#define ALARM_BUTTON_PIN  14      // Big button to arm the alarm
#define DOOR_SWITCH_PIN   15      // Magnetic switch on door
#define LCD_SERIAL_RX     16      // Not actually connected but need pin assigned for now
#define DOOR_BELL_PIN     17      // Door bell pin


// Constants for audio playback
#define USER_TUNE_LENGTH    30      // Max number of notes in entry melody

// Constants for PN532 NFC reader
#define NFC_READ_INTERVAL     100     // time in ms between NFC reads
#define ID_SEND_INTERVAL      1000    // time in ms between sending card IDs
#define SAME_ID_SEND_INTERVAL 5000  // time in ms between re-sending same card ID

// Constants for NeoPixel ring
#define NUMPIXELS           16      // Number of NeoPixels in Ring
#define COLOR_IDLE          0,100,120
#define COLOR_SUCCESS1      0,60,20
#define COLOR_SUCCESS2      0,30,10
#define COLOR_FAILURE1      60,20,0
#define COLOR_FAILURE2      30,10,0
#define COLOR_WAITING       120,120,20
#define COLOR_ERROR1        25,10,0
#define COLOR_ERROR2        25,10,0
#define COLOR               Adafruit_NeoPixel::Color

// Constants for machine states
#define S_INITIALIZING      0
#define S_UNADDRESSED       1
#define S_WAIT_SEND         2
#define S_READY             3          


/*-----( Declare objects )-----*/
Reader card_reader;
rs485 bus(SSerialTxControl);
//SuperSerial* superSerial;
//TEMPORARY TEST CODE

Ring status_ring(RING_PIN, NUMPIXELS);
LCD readout;
Audio speaker(SPEAKER_PIN);
Strike door_latch(LATCH_PIN);
Config conf;

// Load config info saved in EEPROM
uint8_t address = conf.GetAddress();
SuperSerial superSerial(&bus, address);

/*-----( Declare Variables )-----*/
uint8_t byteReceived;
boolean alarmButton = 0;
boolean doorState = 0;
boolean doorBell = 0;
uint32_t lastIDSend = 0;

//TODO: store start tune and other settings in EEPROM, make configurable
byte startTune[] = {NOTE_C4, NOTE_D4};    
byte startTuneDurations[] = {4,4};
byte userTune[USER_TUNE_LENGTH];
byte userTuneDurations[USER_TUNE_LENGTH];
byte state = S_INITIALIZING;

/*-----( Declare Functions )-----*/
uint8_t* nfc_poll();
void CheckReader();
void CheckInputs();
void ProcessMessage();

SoftwareSerial dbgPort(6,7);
SoftwareSerial* debugPort = &dbgPort;

void setup(void) {
  // Initialize debug port and pass references
  dbgPort.begin(57600);
  superSerial.SetDebugPort(debugPort);
  bus.SetDebugPort(debugPort);
  card_reader.SetDebugPort(debugPort);
  
  Serial.begin(9600);   //TODO:  What is this doing here?
  
  LOG_INFO(F("########################################\r\n"));
  LOG_INFO(F("#            Start Program             #\r\n"));
  LOG_INFO(F("########################################\r\n"));


  // Set input pins
  pinMode(DOOR_SWITCH_PIN, INPUT_PULLUP);
  pinMode(ALARM_BUTTON_PIN, INPUT_PULLUP);
  
  
  //conf.SaveAddress(0x02);             //TODO: this is temporary; needs to be configurable
  

 // superSerial = new SuperSerial(&bus, address);
 
  door_latch.Lock();  // In case the program crashed, make sure door doesn't stay unlocked

  LOG_INFO(F("Address: "));
  LOG_INFO(address);
  LOG_INFO(F("\r\n"));
  readout.Print("Initializing...");
  // notify server that client has started
  superSerial.QueueMessage(F_CLIENT_START, 0, 0);
  
  #ifdef MOD_NFC_READER
  if(!card_reader.start())  {
    status_ring.SetMode(M_SOLID, COLOR(COLOR_ERROR1), COLOR(COLOR_ERROR2), 100, 0);
  }
  else  
  #endif
  {
  status_ring.SetMode(M_PULSE, COLOR(COLOR_IDLE), COLOR(COLOR_IDLE), 1000 , 0);
  speaker.Play(startTune, startTuneDurations, 2);
  state = S_READY;
  }
}


void loop(void) {
  LOG_DUMP(F("Free RAM: "));
  LOG_DUMP(freeRam());
  LOG_DUMP (F("\r\n"));
  static byte lastState = state;
  if (state != lastState)  {
    lastState = state;
    LOG_INFO(F("State changed to: "));
    LOG_INFO(state);
    LOG_INFO(F("\r\n"));
  }
  static uint32_t lastRead = 0;
  uint32_t currentMillis = millis();
  switch(state)
  {
    case S_READY:
    {
      #ifdef MOD_NFC_READER
      if ((currentMillis - lastRead ) > NFC_READ_INTERVAL &&
          (currentMillis - lastIDSend) > ID_SEND_INTERVAL)  {
        CheckReader();
        lastRead = currentMillis;
      }
      #endif
      CheckInputs();
    }
      
    case S_WAIT_SEND:
    {
      if (!doorState && !door_latch.HoldingOpen() && !door_latch.Locked())  {
        LOG_DEBUG(F("Door opened, re-latching\r\n"));
        door_latch.Lock();
      }
    }

    case S_UNADDRESSED:
    {
      superSerial.Update();
      if (!superSerial.DataQueued())
        state = S_READY;
      if (superSerial.NewMessage())  {
        ProcessMessage();
      }
    }

    case S_INITIALIZING:
    {
      speaker.Update();
      status_ring.Update();
      door_latch.Update();
    }  
  }
}

void CheckReader()  {
  LOG_DUMP(F("Checking NFC Reader\r\n"));
  //check for NFC card
  static uint8_t lastuid[7] = {0};
  uint8_t uid[7] = {0};
  uint8_t id_length;
  bool sameID = true;
  if(card_reader.poll(uid, &id_length))  {
    for (int i = 0; i < 6; i++)  {
      if (uid[i] != lastuid[i]){
        sameID = false;
        break;
      }
    }    
    #if LOG_LVL>2
    LOG_INFO(F("Scanned ID: "));
    for(int i=0; i<7; i++)  {
      LOG_INFO(uid[i]);
      LOG_INFO(F(" "));
    }
    LOG_INFO(F("\r\n"));
    #endif
    if (!sameID || millis() - lastIDSend > SAME_ID_SEND_INTERVAL) {
      superSerial.QueueMessage(F_SEND_ID, uid, 7);
      state = S_WAIT_SEND;
      lastIDSend = millis();
      status_ring.SetMode(M_SOLID, COLOR(COLOR_WAITING), COLOR(COLOR_WAITING), 0, 3000);
      arrayCopy(uid, lastuid, 7, 0);
      LOG_DUMP(F("Sending scanned ID.\r\n"));
    }
    else  {
      LOG_DEBUG(F("Not re-sending same ID more than once in configured timeout.\r\n"));
    }
  }
  //TODO: Detect unrecoverable reader error
}

void ProcessMessage()  {
  Message msg = superSerial.GetMessage();
  // If address is not set, ignore all functions other than setting address
  if (state == S_UNADDRESSED && msg.function != F_SET_ADDRESS)  {
    return;
  }
  //Process functions
  LOG_INFO(F("Got Message: "));
  switch(msg.function)
  {
    case F_SET_ADDRESS:
      LOG_INFO(F("Set Address\r\n"));
      conf.SaveAddress(msg.payload[0]);
      state = S_READY;
      break;
      
    case F_DENY_CARD:
      LOG_INFO(F("Card Denied\r\n"));
      status_ring.SetMode(M_FLASH, COLOR(COLOR_FAILURE1), COLOR(COLOR_FAILURE2), 200, 3000);
      break;
      
    case F_UNLOCK_DOOR:
      LOG_INFO(F("Unlock Door\r\n"));
      if (doorState)  {
        LOG_DEBUG(F("Unlocking for "));
        LOG_DEBUG((msg.payload[0] << 8) + msg.payload[1]);
        LOG_DEBUG(F(" seconds.\r\n"));
        door_latch.Unlock(((msg.payload[0] << 8) + msg.payload[1]));
      }
      else
        LOG_DEBUG(F("Door Open, so not unlatching\r\n"));
      status_ring.SetMode(M_FLASH, COLOR(COLOR_SUCCESS1), COLOR(COLOR_SUCCESS2), 200, 3000);
      break;
      
    case F_LOCK_DOOR:
      LOG_INFO(F("Lock Door\r\n"));
      door_latch.Lock();
      break;
      
    case F_PLAY_TUNE:
    {
      LOG_INFO(F("Play Tune\r\n"));
      byte tune_length = (msg.length)/2;
      for(byte i = 0; i < tune_length; i++)  {
        userTune[i] = msg.payload[i];
        userTuneDurations[i] = msg.payload[i + tune_length];
      }
      speaker.Play(userTune, userTuneDurations, tune_length);   
      break;
    }
    case F_SET_LIGHTS:
    {
      LOG_INFO(F("Set Lights\r\n"));
      status_ring.SetMode(msg.payload[0], 
                          COLOR(msg.payload[1],msg.payload[2],msg.payload[3]),
                          COLOR(msg.payload[4],msg.payload[5],msg.payload[6]),
                         (msg.payload[7]<<8) + msg.payload[8], (msg.payload[9]<<8)+msg.payload[10]);
      break;
    }
    case F_SET_LCD:
    {
      LOG_INFO(F("Set LCD\r\n"));
      char printString[msg.length + 1];
      arrayCopy(msg.payload, (byte*) printString, msg.length);
      printString[msg.length+1] = '\0';
      readout.Print(printString);
      break;
    }
    
    default:
      LOG_WARNING(F("Unrecognized Command\r\n"));
  }
}

void CheckInputs()  {
  if(digitalRead(ALARM_BUTTON_PIN) != alarmButton)  {
    alarmButton = !alarmButton;
    if (alarmButton == 1)  {
      LOG_INFO(F("Arm Alarm Button Pressed\r\n"));
      byte payload[1] = {alarmButton};
      superSerial.QueueMessage(F_ALARM_BUTTON, payload, 1);
      state = S_WAIT_SEND;
    }
    return;
  }
    
  if(digitalRead(DOOR_SWITCH_PIN) != doorState)  {
    LOG_INFO(F("Door State Changed\r\n"));
    doorState = !doorState;
    byte payload[1] = {doorState};
    superSerial.QueueMessage(F_DOOR_STATE, payload, 1);
    state = S_WAIT_SEND;
    return;
  }
  #ifdef MOD_DOORBELL
  if(digitalRead(DOOR_BELL_PIN) != doorBell)  {
    doorBell = !doorBell;
    if (doorBell == 1)  {
      LOG_INFO(F("Door Bell Pressed\r\n"));
      byte payload[1] = {doorBell};
      superSerial.QueueMessage(F_DOOR_BELL, payload, 1);
      state = S_WAIT_SEND;
    }
    return;
  }
  #endif
}
