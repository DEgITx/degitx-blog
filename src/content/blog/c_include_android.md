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

The "C_INCLUDES must be under the source or output directories" error usually means that the sources are not listed under `LOCAL_C_INCLUDES`:

```bash
LOCAL_C_INCLUDES += \
    $(LOCAL_PATH) \
    $(LOCAL_PATH)/src
```

But watch out for symlinks as well: the same error appears when the folder was created as a symlink, so keep that case in mind too.
