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
#define SSerialTxControl  2       // RS485 Direction control
#define SPEAKER_PIN       3       // Tone generation pin
#define LATCH_PIN         4       // Digital pin to trigger door strike circuit
#define RING_PIN          5       // Pin communicating with NeoPixel Ring
#define LCD_RESET         6       // LCD reset pin
#define LCD_DC            7       // LCD DC? pin
#define LCD_CS            8       // LCD Chip Select Pin
#define NFC_RESET_PIN     9       // Pin to reset RC522 NFC module
#define NFC_CS_PIN        10      // NFC reader Chip Select pin
#define SPI_MOSI          11      // Reserved for hardware SPI for NFC reader
#define SPI_MISO          12      // Reserved for hardware SPI for NFC reader
#define SPI_CLK           13      // Reserved for hardware SPI for NFC reader
#define ALARM_BUTTON_PIN  14      // Big button to arm the alarm
#define DOOR_SWITCH_PIN   15      // Magnetic switch on door
#define DOOR_BELL_PIN     16      // Door bell pin
#define DEBUG_RX          17      // Debug Serial Receive pin [NOT IN USE]
#define DEBUG_TX          18      // Debug Serial Transmit pin
#define TOUCH_CS          19      // Touch screen Chip Select pin

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
