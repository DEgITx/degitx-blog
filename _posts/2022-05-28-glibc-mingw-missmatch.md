---
layout: post
date: 2022-05-27 11:32 PM
title: "Missmatch of libstd++ library / _zst28__throw_bad_array_new_lengthv error"
description: _zst28__throw_bad_array_new_lengthv error
comments: true
category: 
- general
tags:
- C++
- C
- mingw
- error
- windows
---
For example you install new compiler or MinGW C++ and you met error of _zst28__throw_bad_array_new_lengthv after compile time. You can verify you compiler with simple example:

{% highlight cpp linenos %}
#include <iostream>
#include <vector>

using namespace std;
int main(void)
{
    vector <int> a = {2, 0, 1}; // problem line
    cout << "hellow world";
    return 0;
}
{% endhighlight %}

If you still get error on such simple example you have system libstd++ missmatch. Your system is taking this library from some other part of the system (NOT from compiler directory) of the %PATH% location. Edit you PATH variable and make compiler directory (for example: c:\mingw64\bin) to be ABOVE the problematic one. Or with other words: compiler directory must have more priority. Very popular problematic place is git - C:\Git\mingw64\bin, move it to the end of %PATH%.

The error must go away.