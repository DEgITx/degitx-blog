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

In some cases you want close the window on windows with ctrl+c combination, or invoke event for different reasons. On windows you can make such small program:

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

As argument you can pass a pid or the window proccess. (You can get it via system monitor).
