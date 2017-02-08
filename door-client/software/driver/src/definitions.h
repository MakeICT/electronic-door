// Module selection
#define MOD_SERIAL
#define MOD_LIGHT_RING
#define MOD_LATCH
#define MOD_ALARM_BUTTON
#define MOD_DOOR_SWITCH
#define MOD_NFC_READER
#define MOD_DOORBELL
#define MOD_CHIME
#define MOD_LCD

// Pin assignments
#define RS485_RX          0       // Reserved for hardware serial
#define RS485_TX          1       // Reserved for hardware serial
#define RING_PIN          2       // Pin communicating with NeoPixel Ring
#define NFC_RESET_PIN     3       // Pin to reset RC522 NFC module
#define LCD_SERIAL_TX     4       // Serial data for LCD
#define LATCH_PIN         5       // Digital pin to trigger door strike circuit
#define SSerialRX         6       // Debug Serial Receive pin (Not used)
#define SSerialTX         7       // Debug Serial Transmit pin
#define SSerialTxControl  8       // RS485 Direction control
#define SPEAKER_PIN       9       // Tone generation pin
#define NFC_CS_PIN        10      // SPI Slave Select pin
#define NFC_SPI_1         11      // Reserved for hardware SPI for NFC reader
#define NFC_SPI_2         12      // Reserved for hardware SPI for NFC reader
#define NFC_SPI_3         13      // Reserved for hardware SPI for NFC reader
#define ALARM_BUTTON_PIN  14      // Big button to arm the alarm
#define DOOR_SWITCH_PIN   15      // Magnetic switch on door
#define LCD_SERIAL_RX     16      // Not actually connected but need pin assigned for now
#define DOOR_BELL_PIN     17      // Door bell pin

//Set log level
#define LOG_LVL 0

//Force client address
#define CLIENT_ADDRESS 0x09

// NFC Reader selection
#define READER_RC522
//#define READER_PN532

// Constants for audio playback
#define USER_TUNE_LENGTH    30      // Max number of notes in entry melody

// Constants for PN532 NFC reader
#define NFC_READ_INTERVAL     100     // time in ms between NFC reads
#define ID_SEND_INTERVAL      1000    // time in ms between sending card IDs
#define SAME_ID_SEND_INTERVAL 5000    // time in ms between re-sending same card ID

// Constants for NeoPixel ring
#define NUMPIXELS           16      // Number of NeoPixels in Ring
