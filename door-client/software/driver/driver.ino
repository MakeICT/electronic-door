/*-----( Import needed libraries )-----*/
#include <SoftwareSerial.h>
#include <SPI.h>
#include <LiquidCrystal.h>
#include <Adafruit_NeoPixel.h>
#include <EEPROM.h>
#include <PN532_SPI.h>
#include "PN532Interface.h"

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

/*-----( Declare Constants and Pin Numbers )-----*/
#define DEBUG1

// Pin assignments
#define RING_PIN            2       // Pin communicating with NeoPixel Ring
#define PN532_SS_PIN        10      // SPI Slave Select pin
#define SPEAKER_PIN         9       // Tone generation pin
#define LATCH_PIN           5       // Digital pin to trigger door strike circuit
#define SSerialRX           3       // Serial Receive pin
#define SSerialTX           4       // Serial Transmit pin
#define SSerialTxControl    8       // RS485 Direction control
#define DOOR_SWITCH_PIN     A0      // Magnetic switch on door
#define ALARM_BUTTON_PIN    A1      // Big button to arm the alarm

// Constants for audio playback
#define USER_TUNE_LENGTH    30      // Max number of notes in entry melody

// Constants for PN532 NFC reader
#define NFC_READ_INTERVAL   100     // time in ms between NFC reads
#define ID_SEND_INTERVAL    1000    // time in ms between sending card IDs

// Constants for NeoPixel ring
#define NUMPIXELS           16      // Number of NeoPixels in Ring
#define COLOR               Adafruit_NeoPixel::Color
#define COLOR_IDLE          0,100,120
#define COLOR_SUCCESS       0,60,20
#define COLOR_ERROR         50,20,0
#define COLOR_BACKGROUND    0,20,50

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
SuperSerial superSerial(&bus, 0x01);

Ring status_ring(RING_PIN, NUMPIXELS);
LCD readout;
Audio speaker(SPEAKER_PIN);
Strike door_latch(LATCH_PIN);
Config conf;

/*-----( Declare Variables )-----*/
uint8_t byteReceived;
boolean alarmButton = 0;
boolean doorState = 0;
uint32_t lastIDSend = 0;
//TODO: store start tune and other settings in EEPROM, make configurable
byte startTune[] = {NOTE_C4, NOTE_G3, NOTE_G3, NOTE_A3, NOTE_G3, 0, NOTE_B3, NOTE_C4};    
byte startTuneDurations[] = {12, 6, 6, 12, 12, 12, 12, 12};
byte userTune[USER_TUNE_LENGTH];
byte userTuneDurations[USER_TUNE_LENGTH];
byte state = S_INITIALIZING;

/*-----( Declare Functions )-----*/
uint8_t* nfc_poll();
void CheckReader();
void CheckInputs();
void ProcessMessage();

SoftwareSerial debugPort(6,7);

void setup(void) {
  debugPort.begin(57600);
  Serial.begin(9600);
  debugPort.println("Start Program");
  pinMode(DOOR_SWITCH_PIN, INPUT_PULLUP);
  pinMode(ALARM_BUTTON_PIN, INPUT_PULLUP);
  conf.SaveAddress(0x01);
  uint8_t address = conf.GetAddress();
  debugPort.println("before SS");
  //superSerial = new SuperSerial(&bus, address);
  superSerial.SetDebugPort(&debugPort);
  bus.SetDebugPort(&debugPort);
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
  status_ring.SetMode(M_PULSE, COLOR(COLOR_IDLE), 1000 , 0);
  speaker.Play(startTune, startTuneDurations, 8);
  state = S_READY;
}


void loop(void) {
  //debugPort.print("Free RAM: ");
  //debugPort.println(freeRam());
  static byte lastState = state;
  if (state != lastState)  {
    lastState = state;
    //debugPort.print("State: ");
    //debugPort.println(state);
  }
  switch(state)
  {
    //debugPort.print("State: ");
    case S_READY:
    //debugPort.println("Ready");
    {
      //debugPort.println("");
      static uint32_t lastRead = 0;
      uint32_t currentMillis = millis();
      if ((currentMillis - lastRead ) > NFC_READ_INTERVAL &&
          (currentMillis - lastIDSend) > ID_SEND_INTERVAL)  {
        CheckReader();
        lastRead = currentMillis;
      }
      CheckInputs();
    }
      
    case S_WAIT_SEND:
    //debugPort.println("Waiting to send");
    {
      speaker.Update();
      status_ring.Update();
      door_latch.Update();
    }

    case S_UNADDRESSED:
   //debugPort.println("Unaddressed");
    {
      superSerial.Update();
      if (!superSerial.DataQueued())
        state = S_READY;
      if (superSerial.NewMessage())  {
        debugPort.println("Processing New Message");
        ProcessMessage();
      }
    }

   // case S_INITIALIZING:  
  }
}

void CheckReader()  {
  //check for NFC card
  uint8_t uid[7];
  uint8_t id_length;
  if(card_reader.poll(uid, &id_length))  {
    superSerial.QueueMessage(F_SEND_ID, uid, 7);
    state == S_WAIT_SEND;

    lastIDSend = millis();

    //TEMPORARY TEST CODE
    status_ring.SetMode(M_FLASH, COLOR(COLOR_SUCCESS), 200, 3000);
    //door_latch.Unlock(3000);
    speaker.Play(startTune, startTuneDurations, 8);
  }
}

void ProcessMessage()  {
  Message msg = superSerial.GetMessage();
  // If address is not set, ignore all functions other than setting address
  if (state == S_UNADDRESSED && msg.function != F_SET_ADDRESS)  {
    return;
  }
  //Process functions
  debugPort.print("Got Message: ");
  debugPort.println(msg.function);
  switch(msg.function)
  {
    case F_SET_ADDRESS:
      conf.SaveAddress(msg.payload[0]);
      state = S_READY;
      break;
    case F_GET_UPDATE:
      //if there are events on the event stack
          //report them
      //else
          //NAK
    case F_UNLOCK_DOOR:
      door_latch.Unlock(msg.payload[0] * 1000);
      break;
    case F_LOCK_DOOR:
      door_latch.Lock();
      break;
    case F_PLAY_TUNE:
    {
      byte tune_length = (msg.length)/2;
      for(byte i = 0; i < tune_length; i++)  {
        userTune[i] = msg.payload[i];
      }
      for(byte i = 0; i < tune_length; i++)  {
        userTuneDurations[i] = msg.payload[i + tune_length];
      }
      speaker.Play(userTune, userTuneDurations, tune_length);   
      break;
    }
    case F_SET_LIGHTS:
    {
      debugPort.println("setting lights");
      status_ring.SetMode(msg.payload[0], 
                          COLOR(msg.payload[1],msg.payload[2],msg.payload[3]), 
                         (msg.payload[4]<<8) + msg.payload[5], (msg.payload[6]<<8)+msg.payload[7]);
      break;
    }
  }
}

void CheckInputs()  {
  if(digitalRead(ALARM_BUTTON_PIN) != alarmButton)  {
    alarmButton = !alarmButton;
    if (alarmButton == 1)  {
      byte payload[1] = {alarmButton};
      superSerial.QueueMessage(F_ALARM_BUTTON, payload, 1);
      state = S_WAIT_SEND;
    }
    return;
  }
    
  if(digitalRead(DOOR_SWITCH_PIN) != doorState)  {
    doorState = !doorState;
    byte payload[1] = {doorState};
    superSerial.QueueMessage(F_DOOR_STATE, payload, 1);
    state = S_WAIT_SEND;
    return;
  }
}


