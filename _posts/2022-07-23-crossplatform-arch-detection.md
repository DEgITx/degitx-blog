---
layout: post
date: 2022-07-23 11:32 PM
title: "Crossplatform C++ Arch detection"
description: arch x64_86 x86
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
- linux
- macos
- windows
- cmake
---
You can simply get current arch usign following code, where on windows can be used GetNativeSystemInfo() and on macos and linux uname() function:

{% highlight cpp linenos %}
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
{% endhighlight %}

OS detection can be done for example on cmake side or with other definition like `__WIN32`:

{% highlight cmake linenos %}
if(WIN32)
    add_definitions(-DCPK_OS_WIN)
else()
    if (${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
        add_definitions(-DCPK_OS_MACOS)
    else()
        add_definitions(-DCPK_OS_LINUX)
    endif()
endif()
{% endhighlight %}