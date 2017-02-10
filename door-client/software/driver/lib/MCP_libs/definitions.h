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
#define COMM_RX           0       // Reserved for hardware serial
#define COMM_TX           1       // Reserved for hardware serial
#define ESP_CHPD          2       // ESP8266 CH_PD pin
#define SPEAKER           3       // Tone generation pin
#define LATCH             4       // Digital pin to trigger door strike circuit
#define RING              5       // Pin communicating with NeoPixel Ring
#define NFC_RST           6       // NFC reset pin
#define NFC_CS            7       // NFC chip select pin
#define LCD_DC            8       // LCD DC Pin
#define LCD_RST           9       // LCD reset pin
#define LCD_CS            10      // LCD chip select pin
#define SPI_MOSI          11      // Reserved for hardware SPI for NFC reader
#define SPI_MISO          12      // Reserved for hardware SPI for NFC reader
#define SPI_CLK           13      // Reserved for hardware SPI for NFC reader
#define ALARM_BUTTON      14      // Big button to arm the alarm
#define DOOR_SWITCH       15      // Magnetic switch on door
#define LCD_SERIAL_RX     16      // Not actually connected but need pin assigned for now
#define DOOR_BELL         17      // Door bell pin
#define DEBUG_TX          18      // Debug Serial Transmit pin
#define TOUCH_CS          19      // Touch screen Chip Select pin

//Set log level
#define LOG_LVL           4

//Force client address
#define CLIENT_ADDRESS    0x09

// NFC Reader selection
//#define READER_RC522
#define READER_PN532

// Constants for audio playback
#define USER_TUNE_LENGTH    30      // Max number of notes in entry melody

// Constants for PN532 NFC reader
#define NFC_READ_INTERVAL     100     // time in ms between NFC reads
#define ID_SEND_INTERVAL      1000    // time in ms between sending card IDs
#define SAME_ID_SEND_INTERVAL 5000    // time in ms between re-sending same card ID

// Constants for NeoPixel ring
#define NUMPIXELS           16      // Number of NeoPixels in Ring
