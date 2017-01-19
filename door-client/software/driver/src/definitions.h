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

//Set log level
#define LOG_LVL 4

//Force client address
//#define CLIENT_ADDRESS 0x99

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
