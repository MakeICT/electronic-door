/*-----( Include needed libraries )-----*/
#include <avr/wdt.h>
#include <Arduino.h>
#include <SoftwareSerial.h>
//#include <SPI.h>
//#include <LiquidCrystal.h>
//#include <Adafruit_NeoPixel.h>
//#include <EEPROM.h>
//#include <PN532_SPI.h>
//#include <MFRC522.h>    //TODO: only include if necessary
//#include "PN532Interface.h"




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

/*-----( Declare Constants and Pin Numbers )-----*/

// Constants for machine states
#define S_INITIALIZING      0
#define S_NO_SERVER         1
#define S_UNADDRESSED       2
#define S_WAIT_SEND         3
#define S_READY             4


/*-----( Declare objects )-----*/
Reader card_reader;
rs485 bus(SSerialTxControl);
//SuperSerial* superSerial;
//TEMPORARY TEST CODE

Ring statusRing(RING_PIN, NUMPIXELS);
//LCD readout;
Audio speaker(SPEAKER_PIN);
Strike doorLatch(LATCH_PIN);
Config conf;

uint8_t address = ADDR_CLIENT_DEFAULT;     //@TODO: this shouldn't be necessary
SuperSerial superSerial(&bus, address);

/*-----( Declare Variables )-----*/
//uint8_t byteReceived;
boolean alarmButton = 0;
#ifdef MOD_DOOR_SWITCH
boolean doorState = 0;
#else
boolean doorState = 1;
#endif
boolean doorBell = 1;
uint32_t lastIDSend = 0;
uint32_t lastHeartBeat = 0;

//byte userTune[USER_TUNE_LENGTH];
//byte userTuneDurations[USER_TUNE_LENGTH];
byte state = S_INITIALIZING;

/*-----( Declare Functions )-----*/
uint8_t* nfc_poll();
void CheckReader();
void CheckInputs();
void ProcessMessage();

SoftwareSerial dbgPort(6,7);
SoftwareSerial* debugPort = &dbgPort;

LCD readout;

void setup(void) {
  // Initialize debug port and pass references
  watchdogSetup();
  dbgPort.begin(57600);
  superSerial.SetDebugPort(debugPort);
  bus.SetDebugPort(debugPort);
  card_reader.SetDebugPort(debugPort);
  conf.SetDebugPort(debugPort);
  speaker.SetDebugPort(debugPort);
  conf.Init();

  Serial.begin(9600);   //@TODO:  What is this doing here?
  LOG_INFO(F("\r\n\r\n"));
  LOG_INFO(F("########################################\r\n"));
  LOG_INFO(F("#            Start Program             #\r\n"));
  LOG_INFO(F("########################################\r\n"));


  // Set input pins
  pinMode(DOOR_SWITCH_PIN, INPUT_PULLUP);
  pinMode(ALARM_BUTTON_PIN, INPUT_PULLUP);
  pinMode(DOOR_BELL_PIN, INPUT_PULLUP);
  //pinMode(LCD_SERIAL_TX, OUTPUT);

  #ifdef MOD_DOOR_SWITCH
  doorState = digitalRead(DOOR_SWITCH_PIN);
  #endif

 // superSerial = new SuperSerial(&bus, address);

  doorLatch.Lock();  // In case the program crashed, make sure door doesn't stay unlocked

  //for testing only
  #ifdef CLIENT_ADDRESS
  conf.SetAddress(CLIENT_ADDRESS);
  conf.SaveCurrentConfig();
  #endif

  address = conf.GetAddress();
  superSerial.SetAddress(address);

  LOG_INFO(F("Address: "));
  LOG_INFO(address);
  LOG_INFO(F("\r\n"));
  readout.Print("Initializing...");

  #ifdef MOD_NFC_READER
  if(!card_reader.start())  {
    statusRing.SetMode(conf.GetErrorLightSequence());
    readout.Print("NFC Reader      not detected!");
  }
  else
  #endif
  {
    statusRing.SetMode(conf.GetDefaultLightSequence());
    speaker.Play(conf.GetStartTune());
    state = S_READY;
  }

  // notify server that client has started
  superSerial.QueueMessage(F_CLIENT_START, 0, 0);

}


void loop(void) {
  static uint8_t limit = 0;
  if (limit++ == 0)
    LOG_DEBUG(F("."));
  wdt_reset();
  LOG_DUMP(F("Free RAM: "));
  LOG_DUMP(freeRam());
  LOG_DUMP (F("\r\n"));
  static uint8_t lastState = 10;
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
      if (!doorState && !doorLatch.HoldingOpen() && !doorLatch.Locked())  {
        LOG_DEBUG(F("Door opened, re-latching\r\n"));
        doorLatch.Lock();
      }
      if (currentMillis - lastHeartBeat > HEARTBEAT_TIMEOUT)  {
        //Set LEDS and LCD to indicate loss of communication
        LOG_ERROR(F("Lost contact with server!\r\n"));
        readout.Print("  Lost Contact    With  Server  ");
        statusRing.SetMode(conf.GetErrorLightSequence());
        state = S_NO_SERVER;
        break;
      }
    }

    case S_UNADDRESSED:
    {
      superSerial.Update();
      if (!superSerial.DataQueued()) {
        state = S_READY;
      }
    }

    case S_NO_SERVER:
    {
      if (state == S_NO_SERVER)  {
        superSerial.Update();
      }
      if (superSerial.NewMessage())  {
        if (state == S_NO_SERVER)  {
          LOG_DEBUG(F("Contact with server re-established\r\n"));
          //reset lights to idle
          statusRing.SetMode(conf.GetDefaultLightSequence());
          superSerial.QueueMessage(F_CLIENT_START, 0, 0);
        }
        state = S_WAIT_SEND;
        ProcessMessage();
      }
    }

    case S_INITIALIZING:
    {
      speaker.Update();
      statusRing.Update();
      doorLatch.Update();
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
  static uint8_t readFailures = 0;

  uint8_t result = card_reader.poll(uid, &id_length);
  while (result == 2)  {
    if (++readFailures > 2)  {
      LOG_DEBUG(F("NFC read failed 3 times.  Commiting suicide.\r\n"));
      while(1);   //hang program and force watchdog reset; (this is probably not the best thing)
    }
    result = card_reader.poll(uid, &id_length);
  }

  readFailures = 0;   //reset failure counter on successful read
  if (result == 1)  {
    for (int i = 0; i < 7; i++)  {
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
      statusRing.SetMode(conf.GetWaitLightSequence());
      arrayCopy(uid, lastuid, 7, 0);
      LOG_DUMP(F("Sending scanned ID.\r\n"));
    }
    else  {
      LOG_DEBUG(F("Not re-sending same ID more than once in configured timeout.\r\n"));
    }
  }
  else  {
    //Do nothing if no new card read
  }
}

void ProcessMessage()  {
  Message msg = superSerial.GetMessage();

  //reset heartbeat timeout
  lastHeartBeat = millis();

  // If address is not set, ignore all functions other than setting address
  if (state == S_UNADDRESSED && msg.function != F_SET_CONFIG)  {
    return;
  }
  //Process functions
  LOG_INFO(F("Got Message: "));
  switch(msg.function)
  {
    case F_HEARTBEAT:
      LOG_INFO(F("Heartbeat Ping\r\n"));

    case F_SET_CONFIG:
      LOG_INFO(F("Set Config:"));
      switch(msg.payload[0])
      {
        case 0x00:
        LOG_INFO(F("Address:"));
        LOG_INFO(msg.payload[1]);
        LOG_INFO(F("\r\n"));
        conf.SetAddress(msg.payload[1]);
        conf.SaveCurrentConfig();
        superSerial.SetAddress(msg.payload[1]);
        break;

        case 0x01:
        {
          LOG_INFO(F("Start Tune\r\n"));
          uint8_t tune_length = (msg.length-1)/2;
          struct tune temp = {.length = tune_length};
          for(uint8_t i = 0; i < tune_length; i++)  {
            temp.notes[i] = msg.payload[i+1];
            temp.durations[i] = msg.payload[i+1 + tune_length];
          }
          conf.SetStartTune(temp);
          conf.SaveCurrentConfig();
        }
        break;

        case 0x0A:
        case 0x0B:
        case 0x0C:
        case 0x0D:
        case 0x0E:
        {
          struct lightMode newMode =  {msg.payload[1],
                                      COLOR(msg.payload[2],msg.payload[3],msg.payload[4]),
                                      COLOR(msg.payload[5],msg.payload[6],msg.payload[7]),
                                     (msg.payload[8]<<8) + msg.payload[9], (msg.payload[10]<<8)+msg.payload[11]};

          if (msg.payload[0] == 0x0A)  {
            LOG_INFO(F("Default Light Pattern\r\n"));
            conf.SetDefaultLightSequence(newMode);
          }
          if (msg.payload[0] == 0x0B)  {
            LOG_INFO(F("Wait Light Pattern\r\n"));
            conf.SetWaitLightSequence(newMode);
          }
          else if (msg.payload[0] == 0x0C)  {
            LOG_INFO(F("Error Light Pattern\r\n"));
            conf.SetErrorLightSequence(newMode);
          }
          else if (msg.payload[0] == 0x0D)  {
            LOG_INFO(F("Unlock Light Pattern\r\n"));
            conf.SetUnlockLightSequence(newMode);
          }
          else if (msg.payload[0] == 0x0E)  {
            LOG_INFO(F("Deny Light Pattern\r\n"));
            conf.SetDenyLightSequence(newMode);
          }
          conf.SaveCurrentConfig();
          break;
        }
        default:
          LOG_INFO(F("Invalid configuration identifier\r\n"));
          break;
      }
      //state = S_READY;
      break;

    case F_DENY_CARD:
      LOG_INFO(F("Card Denied\r\n"));
      statusRing.SetMode(conf.GetDenyLightSequence());
      break;

    case F_UNLOCK_DOOR:
      LOG_INFO(F("Unlock Door\r\n"));
      if (doorState)  {
        LOG_DEBUG(F("Unlocking for "));
        LOG_DEBUG((msg.payload[0] << 8) + msg.payload[1]);
        LOG_DEBUG(F(" seconds.\r\n"));
        doorLatch.Unlock(((msg.payload[0] << 8) + msg.payload[1]));
      }
      else  {
        LOG_DEBUG(F("Door Open, so not unlatching\r\n"));
      }
      statusRing.SetMode(conf.GetUnlockLightSequence());
      break;

    case F_LOCK_DOOR:
      LOG_INFO(F("Lock Door\r\n"));
      doorLatch.Lock();
      break;

    case F_PLAY_TUNE:
    {
      LOG_INFO(F("Play Tune\r\n"));
      byte tune_length = (msg.length)/2;
      uint8_t userTune[tune_length];
      uint8_t userTuneDurations[tune_length];
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
      statusRing.SetMode(msg.payload[0],
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
      LOG_WARNING(F("Unrecognized Command: "));
      LOG_WARNING(msg.function);
      LOG_WARNING(F("\r\n"));
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

  #ifdef MOD_DOOR_SWITCH
  if(digitalRead(DOOR_SWITCH_PIN) != doorState)  {
    LOG_INFO(F("Door State Changed\r\n"));
    doorState = !doorState;
    byte payload[1] = {doorState};
    superSerial.QueueMessage(F_DOOR_STATE, payload, 1);
    state = S_WAIT_SEND;
    return;
  }
  #endif

  #ifdef MOD_DOORBELL
  if(digitalRead(DOOR_BELL_PIN) != doorBell)  {
    doorBell = !doorBell;
    if (doorBell == 1)  {
      LOG_INFO(F("Door Bell Pressed\r\n"));
      byte payload[1] = {doorBell};
      superSerial.QueueMessage(F_DOOR_BELL, payload, 1);
      state = S_WAIT_SEND;

      //Temporary hard-coded doorbell
      struct tune testA = {26, {0x35,0x00,0x35,0x00,0x35,0x00,0x31,0x00,0x35,0x00,0x38,0x00,0x20},
                               {0x06,0x01,0x06,0x06,0x06,0x06,0x06,0x01,0x06,0x06,0x0b,0x11,0x0b}};
      struct lightMode testL = {M_FLASH, COLOR(120,0,120), COLOR(120,120,120), 200, 3000};
      readout.Print("    You rang?                   ");
      speaker.Play(testA);
      statusRing.SetMode(testL);

    }
    return;
  }
  #endif
}

void watchdogSetup(void)
{
  cli();       // disable all interrupts
  wdt_reset(); // reset the WDT timer
  /*
   WDTCSR configuration:
   WDIE = 0 :Interrupt Enable
   WDE  = 1 :Reset Enable
   WDP3 = 1 :For 8000ms Time-out
   WDP2 = 0 :For 8000ms Time-out
   WDP1 = 0 :For 8000ms Time-out
   WDP0 = 1 :For 8000ms Time-out
  */
  // Enter Watchdog Configuration mode:
  WDTCSR |= (1<<WDCE) | (1<<WDE);
  // Set Watchdog settings:
  WDTCSR = (0<<WDIE) | (1<<WDE) | (1<<WDP3) | (0<<WDP2) | (0<<WDP1) | (1<<WDP0);
  sei();
}

ISR(WDT_vect) // Watchdog timer interrupt.
{
  //Put any future freeze debugging code here
}
