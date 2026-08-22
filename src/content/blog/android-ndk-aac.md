---
title: "Android NDK AAC decoder ADTS alignment"
seoTitle: "Android NDK AAC decoding and ADTS alignment"
description: "Decoding AAC on Android with the NDK AMediaCodec API: SoftAAC2 internals, ADTS header alignment and why the decoder drops your first frames."
pubDate: 2020-07-15
tags:
  - "Android"
  - "SDK"
  - "NDK"
  - "C++"
  - "AAC"
  - "Algorithms"
---

After a long time thinking about it, I finally decided to switch my blog articles to English and to keep sharing rare — and mostly uninteresting — pieces of information in free form. Today we will talk about Android, the NDK and some undocumented video/audio behaviour. Maybe we will discover something new about AAC along the way, and maybe it will help with a problem of yours, as it did with mine.

The focus of this article is the Android AAC decoder, and a few details about how decoding actually works behind the NDK documentation.

## Using AMediaCodec, step by step

First, let's take a very superficial look at how to start decoding with the NDK:

1. Create an AMediaCodec by codec name.
2. Configure it via `AMediaCodec_configure`.
3. Start decoding with `AMediaCodec_start`.
4. Get a buffer with `AMediaCodec_getInputBuffer`.
5. Hand the buffer back with `AMediaCodec_queueInputBuffer`.
6. Repeat as long as you have buffers ;)

It looks very simple, and it works well. I could end the article right here, but that would tell you nothing about buffer requirements and the rest of it — and the NDK/SDK documentation is just as brief. So what is going on behind Android decoding? What if you get an error with your buffer, or have no sound in some rare cases? Let's take the AAC audio decoder as an example and see how it works. Let's start with the simple part.

![Android AAC decoder architecture](/images/ndk-acc/download.jpg)

As you can see in this low-quality JPEG :), Android has several implementations of AAC decoders exposed as OMX components. And that's not all: besides the software implementations, some platforms ship hardware ones, like Broadcom chips do. Keep that in mind — we are heading to the SoftAAC2 decoder. Let's look deeper.

## SoftAAC2

![SoftAAC2 decoder stack](/images/ndk-acc/VS7-04-AAC-Decord-flow.png)

Down at this level we finally see the SoftAAC2 decoder. It doesn't look as simple as "start the AAC decoder" anymore, does it? :) But now we know how the buffer travels from the decoder up to the ACodec abstraction, and we know a little about SoftAAC2 (the default software AAC decoder).

Now let's expand our knowledge of what ADTS AAC packets look like. Here is a good illustration:

![AAC-ADTS sequence](/images/ndk-acc/VS7-02-AAC-ADTS-hejunlin.png)

Note the important detail at the bottom: the `protection_absent` flag decides whether the header is 7 or 9 bytes long.

Now it is time to talk about the main topic of this article — ADTS alignment.

![AAC-ADTS align](/images/ndk-acc/VS7-02-AAC-ADTS-hejunlin_cplit.png)

This is a very typical example of how your receiver gets a buffer without any knowledge of the alignment the encoder expects. So what can you do when the packets are not aligned properly? Let's realign the frames the way every decoder expects them, so that the buffer is split into complete AAC frame chunks.

## AAC-ADTS alignment

First of all, let's detect the beginning of an AAC header:

```cpp
if ((0xFF == frameBuffer[offset]) && ((0xF9 == frameBuffer[offset+1]) || (0xF1 == frameBuffer[offset+1])))
{
 // This is where the AAC header starts
}
```

Now let's read the AAC ES frame size from the frame header:

```cpp
unsigned aac_frame_length =
                    ((frameBuffer[offset+3] & 3) << 11)
                    | (frameBuffer[offset+4] << 3)
                    | (frameBuffer[offset+5] >> 5);
```

Here `offset` can be any lookup counter. It's time to copy the frame data into a buffer struct that holds a size and a buffer.

```cpp
BufferedFrame aacFrame;
aacFrame.size = aac_frame_length;
// Don't forget to allocate aacFrame.buffer!
memcpy(aacFrame.buffer, frameBuffer + offset, aac_frame_length);
```

Continue until you reach the end of the frame. Don't forget to handle the tail of the buffer and to concatenate it with the head of the next one.

The full ADTS alignment algorithm looks like this:

```cpp
ssize_t offset = 0;
vector<BufferedFrame> frames;

// copy_at_end and copy_at_begin are pseudocode: they copy the leftover part of an
// incomplete buffer and complete it with the head of the next buffer chunk

// copy the leftover part of (aac_frame_length - mResSize)
// increase offset += (aac_frame_length - mResSize)
// reset mRes = false;
// concatenate the partial buffers from copy_at_begin and copy_at_end
// to build a complete AAC packet
if(mRes)
    copy_at_end(halFrameBuffer + offset, frameBufferSize - offset); // into some restore buffer

while(offset < frameBufferSize)
{
    if ((0xFF == frameBuffer[offset]) && ((0xF9 == frameBuffer[offset+1]) || (0xF1 == frameBuffer[offset+1])))
    {
        unsigned aac_frame_length =
                    ((frameBuffer[offset+3] & 3) << 11)
                    | (frameBuffer[offset+4] << 3)
                    | (frameBuffer[offset+5] >> 5);

        if (offset + aac_frame_length <= frameBufferSize)
        {
            BufferedFrame aacFrame;
            // You can preallocate your own buffer array to hold the new buffer!
            aacFrame.buffer = localBuf[num++];
            aacFrame.size = aac_frame_length;
            memcpy(aacFrame.buffer, frameBuffer + offset, aac_frame_length);
            frames.push_back(aacFrame);
            offset += aac_frame_length;
        }
        else
        {
            // mRes, mResSize are global
            mRes = true;
            mResSize = frameBufferSize - offset;
            copy_at_begin(halFrameBuffer + offset, mResSize); // into some restore buffer
        }
    }
    else
    {
        offset++;
    }
}
```

The algorithm runs in linear time.
