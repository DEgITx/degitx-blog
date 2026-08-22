---
title: "Cross-platform C++ architecture detection"
seoTitle: "Cross-platform C++ architecture detection"
description: "Detecting CPU architecture (x86, x86_64, ARM, ARM64) at compile time with portable C/C++ preprocessor macros across GCC, Clang and MSVC."
pubDate: 2022-07-22
tags:
  - "C++"
  - "C"
  - "MinGW"
  - "Architecture"
  - "Native"
  - "Cross-platform"
  - "Linux"
  - "macOS"
  - "Windows"
  - "CMake"
---

You can get the current architecture with the code below: on Windows it uses `GetNativeSystemInfo()`, and on macOS and Linux the `uname()` function:

```cpp
std::string GetOSArch()
{
#ifdef CPK_OS_WIN
    SYSTEM_INFO info;
    GetNativeSystemInfo(&info);
    switch (info.wProcessorArchitecture) {
        case PROCESSOR_ARCHITECTURE_AMD64:
            return "x86_64";
        case PROCESSOR_ARCHITECTURE_INTEL:
            return "x86";
        case PROCESSOR_ARCHITECTURE_IA64:
            return "ia64";
    };
#endif
#if defined(CPK_OS_LINUX) || defined(CPK_OS_MACOS)
    long ret = -1;
    struct utsname u;

    if (ret == -1)
        ret = uname(&u);
    if (ret != -1) {
        if (strlen(u.machine) == 4 && u.machine[0] == 'i'
                && u.machine[2] == '8' && u.machine[3] == '6')
            return std::string("x86");
        if (strcmp(u.machine, "amd64") == 0) // Solaris
            return std::string("x86_64");

        return std::string(u.machine);
    }
#endif
    return "";
}
```

OS detection can be done on the CMake side, for example, or with a built-in macro such as `_WIN32`:

```cmake
if(WIN32)
    add_definitions(-DCPK_OS_WIN)
else()
    if (${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
        add_definitions(-DCPK_OS_MACOS)
    else()
        add_definitions(-DCPK_OS_LINUX)
    endif()
endif()
```
