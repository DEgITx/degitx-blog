---
title: "Mingw full static linkage instead of binary"
seoTitle: "Fully static linking with MinGW and CMake"
description: "Linking MinGW binaries fully statically with CMake to drop the libgcc_s_seh-1.dll and libstdc++-6.dll runtime dependencies from your Windows build."
pubDate: 2022-07-30
tags:
  - "C++"
  - "C"
  - "MinGW"
  - "Architecture"
  - "Native"
  - "Cross-platform"
  - "CMake"
  - "Static linking"
  - "Linking"
---

How to avoid usage of libgcc_s_seh-1.dll or libgcc_s_dw2-1.dll ? You need to include following link flags:

```bash
-static-libgcc -static-libstdc++ -static
```

In case of CMake:
```bash
if(MINGW)
    SET(CMAKE_EXE_LINKER_FLAGS  "${CMAKE_EXE_LINKER_FLAGS} -static-libgcc -static-libstdc++ -static")
endif()
```
