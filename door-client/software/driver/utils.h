#ifndef UTILS_H
#define UTILS_H

#define LOG_LVL 3

#define LOG_ERROR(t)         //t
#define LOG_WARNING(t)       //t
#define LOG_INFO(t)          //t
#define LOG_DEBUG(t)         //t
#define LOG_DUMP(t)          //t

#if LOG_LVL > 0
  #define LOG_ERROR(t)    debugPort->print(t)
#endif
#if LOG_LVL > 1
  #define LOG_WARNING(t)  debugPort->print(t)
#endif
#if LOG_LVL > 2
  #define LOG_INFO(t)     debugPort->print(t)
#endif
#if LOG_LVL > 3
  #define LOG_DEBUG(t)    debugPort->print(t)
#endif
#if LOG_LVL > 4
  #define LOG_DUMP(t)  debugPort->print(t)
#endif

#define D debugPort->println
#define dbg debugPort->print

//from Adafruit
inline int freeRam () 
{
  extern int __heap_start, *__brkval; 
  int v; 
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval); 
}

//copy contents of array1 to array 2
inline void arrayCopy (byte* array1, byte* array2, byte length, byte offset=0)  {
  for (int i = 0; i < length; i++)  {
    array2[i] = array1[i + offset];
  }
}

#endif
