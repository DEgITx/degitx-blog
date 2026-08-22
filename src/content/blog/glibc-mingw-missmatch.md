---
title: "Mismatch of the libstdc++ library / _ZSt28__throw_bad_array_new_lengthv error"
seoTitle: "MinGW libstdc++ mismatch: __throw_bad_array_new_length"
description: "Fixing the _ZSt28__throw_bad_array_new_lengthv linker error on MinGW - how a libstdc++ version mismatch happens and how to verify your toolchain."
pubDate: 2022-05-28
tags:
  - "C++"
  - "C"
  - "MinGW"
  - "Debugging"
  - "Windows"
---

Say you install a new compiler or a new MinGW C++ toolchain and you hit the `_ZSt28__throw_bad_array_new_lengthv` error at compile time. You can verify your compiler with a simple example:

```cpp
#include <iostream>
#include <vector>

using namespace std;
int main(void)
{
    vector <int> a = {2, 0, 1}; // problem line
    cout << "hello world";
    return 0;
}
```

If you still get the error on such a simple example, you have a system-wide libstdc++ mismatch: your system picks the library up from some other location in `%PATH%`, not from the compiler directory. Edit your `PATH` variable and move the compiler directory (for example `c:\mingw64\bin`) ABOVE the problematic one — in other words, the compiler directory must have higher priority. A very common offender is Git — `C:\Git\mingw64\bin`; move it to the end of `%PATH%`.

The error should go away.
