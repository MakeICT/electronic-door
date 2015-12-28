#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry
i
debug_cli.py: ClI interface for debugging and testing door hardware

Authors:
        Dominic Canare <dom@greenlightgo.org>
        Rye Kennedy <ryekennedy@gmail.com>
        Christian Kindel <iceman81292@gmail.com>
'''

from cmd import Cmd
from cli_helper import *
import door_control

import os, subprocess, readline

Dir = os.path.realpath(os.path.dirname(__file__))

historyFile = os.path.join(Dir, '.cli-history')

control = door_control.DoorControl()


class DebugCLI(Cmd):
    def __init__(self,completekey='tab', stdin=None, stdout=None):
        Cmd.__init__(self,completekey, stdin, stdout)
        self.prompt = "\001\033[1m\033[34m\002DEBUG_CMD>\001\033[0m\002 "
        try:
            readline.read_history_file(historyFile)
        except IOError:
            open(historyFile, 'a').close()
            readline.read_history_file(historyFile)

    def emptyline(self):
        pass    
   
    def do_port(self, args):
        control.set_port("/dev/tty" + args)
    
    def complete_port(self, text, line, start_index, end_index):
        ports = '/dev/ttyUSB0  /dev/ttyUSB1'.split()
        #ports = os.system('''ls /dev/ttyUSB*''').strip('''/''').split(' ')
        ports = [port[8:] for port in ports]
        #print "\n ports = ",ports,'\n'
        if text:
            return [port for port in ports
                if port.startswith(text)]
        else:
            return ports
        

    def do_display(self, args):
        try:
            packet = []
            while 1:
                if control.receive_packet(packet):
                    control.process_packet(packet)
                    del packet[:]
        except KeyboardInterrupt:
            pass

    def do_unlock(self, args):
        if args:
            duration = int(args)
        else:
            duration = 0
        control.send_packet(function = 1, payload = [duration])

    def do_lock(self, args):
        control.send_packet(function = 2)
 
    def do_play(self, args):
        #print args
        tune = [60, 150]
        if args == 'scale':
            t=[48,50,52,53,55,57,59,60]
            r=[21,21,21,21,21,21,21,12]
        elif args == 'fanfare':
            t=[34,34,32,34,38,40,38,40,43]  
            r=[21,07,07,07,21,07,07,07,42]
        elif args == 'birthday':
            t=[54,54,56,54,59,58,00, 54,54,56,54,61,59,00, 54,54,66,63,59,58,56,00, 64,64,63,59,61,59]
            r=[14,06,20,20,20,20,20, 14,06,20,20,20,20,20, 14,06,20,20,20,20,40,10, 14,06,20,20,23,17]
        if control.send_packet(function=0x05, payload=t+r) == 1:
            putMessage("Serial Port not set!", '', severity.ERROR)
            return
        packet = []
        while 1:
            value = control.receive_packet(packet)
            if value == 1:
                putMessage("Serial Port not set!", '', severity.ERROR)
                return
            while not value:
                pass
            if packet[3] == (0xAA or 0xAB):
                if packet[3] == 0xAB:
                    print "ERROR: Packet NAKed"
                break
            else:
                del packet[:]

    def complete_play(self, text, line, start_index, end_index):
        tunes = ['scale', 'fanfare', 'birthday', 'scale2']
        if text:
            return [tune for tune in tunes
                if tune.startswith(text)]
        else:
            return tunes

    def do_light(self, args):
        a = args.split()
        a = [arg.strip() for arg in a if arg.strip()]

        mode = int(a[0])
        print a
        if a[1] == 'blue':
            color = (0x00, 0x00, 0x40)
        elif a[1] == 'red':
            color = (0x40, 0x00, 0x00)
        elif a[1] == 'green':
            color = (0x00, 0x40, 0x00)
        else:
            color = (0xFF, 0xFF, 0xFF)
        period = int(a[2])
        duration = int(a[3])
        state = [mode, color[0],color[1],color[2], period >> 8, period & 0xFF, duration>>8, duration&0xFF]
        control.send_packet(function=0x08, payload=state)

    def completion(self, text, options):
        return [option for option in options
            if option.startswith(text)]

    def complete_light(self, text, line, start_index, end_index):
        l = line.split()
        l = [line.strip() for line in l if line.strip()]
        options = ["mode ", "color ", "period ", "duration "] 
        
        colors = ["red ", "green ", "blue "]
        if l[-1] == "color":
            return colors
        elif l[-2] == "color" and line[-1] != ' ':
            return self.completion(l[-1], colors)
        elif len(l) <= 1:
            if l[0]:
                return [option for option in options
                    if option.startswith(text)]
            else:
                return options

    def do_exit(self, args):
        readline.write_history_file(historyFile)
        exit(0)

    def help_exit(self):
        print "close DEBUG_CMD"


    def onecmd(self, s):
        try:    
            return Cmd.onecmd(self, s)
        except KeyboardInterrupt:
            #@TODO: this is a work-around, find out what's going on
            os.system("stty echo")
            print '\n'

    def cmdloop(self, intro=None):
        try:
            Cmd.cmdloop(self, intro)
        except KeyboardInterrupt:
            print "\nCaught Ctrl+C, exiting"
            self.do_exit('')

