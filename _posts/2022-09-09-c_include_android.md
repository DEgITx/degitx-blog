---
layout: post
date: 2022-09-09 00:05 AM
title: "C_INCLUDES must be under the source or output directories"
description: C_INCLUDES must be under the source or output directories android error
comments: true
category: 
- general
tags:
- C
- android
- mk
- makefile
- module
- nmake
- ninja
---
"C_INCLUDES must be under the source or output directories" error can indicate the the sources not included under LOCAL_C_INCLUDES
{% highlight bash linenos %}
LOCAL_C_INCLUDES += \
    $(LOCAL_PATH) \
    $(LOCAL_PATH)/src
{% endhighlight %}

But at the same time be aware of symlinks! The problem can be if the folder created with symlinks! So aware of them.

{% endhighlight %}