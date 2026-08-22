---
title: "C_INCLUDES must be under the source or output directories"
seoTitle: "Fixing the NDK C_INCLUDES directory error"
description: "What the Android NDK error \"C_INCLUDES must be under the source or output directories\" actually means and how to fix LOCAL_C_INCLUDES paths."
pubDate: 2022-09-09
tags:
  - "C"
  - "Android"
  - "Makefile"
  - "Build"
  - "Ninja"
---

"C_INCLUDES must be under the source or output directories" error can indicate the the sources not included under LOCAL_C_INCLUDES
```bash
LOCAL_C_INCLUDES += \
    $(LOCAL_PATH) \
    $(LOCAL_PATH)/src
```

But at the same time be aware of symlinks! The problem can be if the folder created with symlinks! So aware of them.
