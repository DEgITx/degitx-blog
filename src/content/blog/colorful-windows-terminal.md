---
title: "Display color output with C/C++ in windows terminal (fix escape characters color displaying)"
seoTitle: "ANSI colors in the Windows terminal from C/C++"
description: "Making ANSI escape colors work in the Windows console from C/C++ with ENABLE_VIRTUAL_TERMINAL_PROCESSING, instead of printing raw escape characters."
pubDate: 2023-03-03
tags:
  - "C"
  - "C++"
  - "Windows"
  - "Terminal"
  - "WinAPI"
  - "ANSI"
---

On windows when you will try to display \033[0m or \x1B[31m and so one, instead of getting color in terminal you will get ]31m. On windows 10 and letter it's pretty easy to fix. You just need to include next code:

```bash
#include <windows.h>

HANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);
if (hConsole)
{
    DWORD consoleMode;
    GetConsoleMode(hConsole, &consoleMode);
    SetConsoleMode(hConsole, consoleMode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
}

// now you can use color printf()
```
