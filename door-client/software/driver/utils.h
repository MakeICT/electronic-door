#ifndef UTILS_H
#define UTILS_H

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
inline void arrayCopy (byte* array1, byte* array2, byte length)  {
  for (int i = 0; i < length; i++)  {
    array2[i] = array1[i];
  }
}

#endif
