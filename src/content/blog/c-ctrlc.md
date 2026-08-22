---
title: "Send Ctrl+C event to any Windows window"
seoTitle: "Send Ctrl+C to any Windows window with WinAPI"
description: "A small WinAPI trick in C++ to send a Ctrl+C (or any key combination) to an arbitrary Windows window found by its process ID."
pubDate: 2018-02-03
tags:
  - "C"
  - "C++"
  - "WinAPI"
  - "Windows"
---

Sometimes you want to close a window on Windows with the Ctrl+C combination, or to raise that event for some other reason. On Windows you can write a small program like this:

```cpp
#include <windows.h>
#include <stdio.h>

int main(int argc, char* argv[])
{
 int pid = atoi( argv[1] );
 printf("kill in console %d", pid);

 FreeConsole();
 if (AttachConsole(pid))
 {
     SetConsoleCtrlHandler(NULL, true);
     GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0);
     FreeConsole();
     SetConsoleCtrlHandler(NULL, false);
 }

 return 0;
}
```

As the argument you pass the PID of the target window's process (you can look it up in the system monitor).
