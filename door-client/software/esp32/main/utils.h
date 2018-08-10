#ifndef UTILS_H
#define UTILS_H

#include "stdlib.h"

int UrlEncode(char* url, char* encode,  char* buffer, unsigned int size)
    {
        char chars[127] = {0};
        unsigned int length = 0;

        if(!url || !encode || !buffer) return 0;

//Create an array to hold ascii chars, loop through encode string
//and assign to place in array. I used this construct instead of a large if statement for speed.
        while(*encode) chars[*encode++] = *encode;

//Loop through url, if we find an encode char, replace with % and add hex
//as ascii chars. Move buffer up by 2 and track the length needed.
//If we reach the query string (?), move to query string encoding
    URLENCODE_BASE_URL:
        while(size && (*buffer = *url)) {
            if(*url == '?') goto URLENCODE_QUERY_STRING;
            if(chars[*url] && size > 2) {
                *buffer++ = '%';
                itoa(*url, buffer, 16);
                buffer++; size-=2; length+=2;
            }
            url++, buffer++, size--; length++;  
        }
        goto URLENCODE_RETURN;

//Same as above but on spaces (' '), replace with plus ('+') and convert
//to hex ascii. I moved this out into a separate loop for speed.
    URLENCODE_QUERY_STRING:
        while(size && (*buffer = *url)) {
            if(chars[*url] && size > 2) {
                *buffer++ = '%';
                if(*url == ' ') itoa('+', buffer, 16);
                else itoa(*url, buffer, 16);
                buffer++; size-=2; length+=2;
            }
            url++, buffer++, size--; length++;
        }

//Terminate the end of the buffer, and if the buffer wasn't large enough
//calc the rest of the url length and return
    URLENCODE_RETURN:
        *buffer = '\0';
        if(*url)
        while(*url) { if(chars[*url]) length+=2; url++; length++; }
        return length;
    }


#endif