---
title: "Display color output with C/C++ in the Windows terminal (fixing printed escape characters)"
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

On Windows, when you try to print `\033[0m`, `\x1B[31m` and so on, you get the raw escape sequence (something like `[31m`) in the terminal instead of colored text. On Windows 10 and later this is pretty easy to fix — you just need to add the following code:

```cpp
#include <windows.h>

HANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);
if (hConsole)
{
    DWORD consoleMode;
    GetConsoleMode(hConsole, &consoleMode);
    SetConsoleMode(hConsole, consoleMode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
}

// now you can use colors in printf()
```
