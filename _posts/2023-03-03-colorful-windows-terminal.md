---
layout: post
date: 2023-03-03 00:05 AM
title: "Display color output with C/C++ in windows terminal (fix escape characters color displaying)"
description: Display color output with C/C++ in windows terminal (fix escape characters color displaying). This topic describe how to proper display colors like red,gree,blue,yellow and so on in color terminal.
comments: true
category: 
- general
tags:
- C
- C++
- windows
- colors
- winapi
- text
- anscii
- escape
- chars
- \033[0m
---
On windows when you will try to display \033[0m or \x1B[31m and so one, instead of getting color in terminal you will get ]31m. On windows 10 and letter it's pretty easy to fix. You just need to include next code:

{% highlight bash linenos %}
#include <windows.h>

HANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);
if (hConsole)
{
    DWORD consoleMode;
    GetConsoleMode(hConsole, &consoleMode);
    SetConsoleMode(hConsole, consoleMode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
}

// now you can use color printf()
{% endhighlight %}
