---
layout: post
date: 2022-08-01 00:05 AM
title: "Mingw full static linkage instead of binary"
description: Mingw full static linkage instead of binary. Remove dependency of libgcc_s_seh-1.dll or libgcc_s_dw2-1.dll
comments: true
category: 
- general
tags:
- C++
- C
- mingw
- arch
- native
- crossplatform
- x64_86
- x86
- cmake
- static
- shared
---
How to avoid usage of libgcc_s_seh-1.dll or libgcc_s_dw2-1.dll ? You need to include following link flags:

{% highlight bash linenos %}
-static-libgcc -static-libstdc++ -static
{% endhighlight %}

In case of CMake:
{% highlight bash linenos %}
if(MINGW)
    SET(CMAKE_EXE_LINKER_FLAGS  "${CMAKE_EXE_LINKER_FLAGS} -static-libgcc -static-libstdc++ -static")
endif()
{% endhighlight %}