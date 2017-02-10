#ifndef UTILS_H
#define UTILS_H

#include "definitions.h"

//#define LOG_LVL 4

#define LOG_ERROR(t)
#define LOG_WARNING(t)
#define LOG_INFO(t)
#define LOG_DEBUG(t)
#define LOG_DUMP(t)

#if LOG_LVL > 0
  #undef LOG_ERROR
  #define LOG_ERROR(t)    debugPort->print(t)
#if LOG_LVL > 1
  #undef LOG_WARNING
  #define LOG_WARNING(t)  debugPort->print(t)
#endif
#if LOG_LVL > 2
  #undef LOG_INFO
  #define LOG_INFO(t)     debugPort->print(t)
#endif
#if LOG_LVL > 3
  #undef LOG_DEBUG
  #define LOG_DEBUG(t)    debugPort->print(t)
#endif
#if LOG_LVL > 4
  #undef LOG_DUMP
  #define LOG_DUMP(t)     debugPort->print(t)
#endif
#endif

//from Adafruit
inline int freeRam ()
{
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

//copy contents of array1 to array 2
inline void arrayCopy (uint8_t* array1, uint8_t* array2, uint8_t length, uint8_t offset=0)  {
  for (int i = 0; i < length; i++)  {
    array2[i] = array1[i + offset];
  }
}

#endif
