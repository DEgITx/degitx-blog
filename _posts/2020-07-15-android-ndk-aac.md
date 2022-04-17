---
layout: post
date: 2020-07-15 11:32 PM
title: "Android NDK AAC decoder ADTS alignment"
description: Alexey Kasyanchuk NDK SoftAAC2 align basics.
comments: true
category: 
- general
tags:
- android
- sdk
- ndk
- C++
- aac
- algorithm
---
After a long thought, I finally decided to switch my blog articles to english, and continue to give some rare and mostly unintresting info in free form. And today we will talk more about Android, NDK and some undocumentated video/audio functionality, maybe will discover some new knowlage about AAC and maybe it will help your own problem, like it was for me.
In a focus of this acrticle is Android AAC decoder, and a little detail how the decoding in android working behind NDK documentation.

### AMediaCodec using steps

First let take a very very surface look how to start decoding using NDK:  
1. Create AMediaCodec using codec name.
2. Configure AMediaCodec via AMediaCodec_configure.
3. Ctart decoding AMediaCodec_start.
4. Give a buffer using AMediaCodec_getInputBuffer.
5. Back buffer with AMediaCodec_queueInputBuffer.
6. Repeat while you have an buffer ;).

Looks very simple, and work good as well. I can end this article in this place, but I don't tell you nothing about buffer requirenments and other stuffs, and in NDK/SDK also all simple like that. So what going on behind this android decoding? What if you getting some error with your buffer, or you don't have sound in some rare cases? How the Android decoder works like, let take a look at AAC audio decoder as example. Let's begin from simple.

<figure>
	<img src="/images/ndk-acc/download.jpg" />
	<figcaption>Android AAC decoder architecture</figcaption>
</figure>

As you see on this bad jpeg picture :) Android have different implementation of AAC decoders as OMX components. But that's not all, beside some software implemetation on some platforms existed hardware implementation, like on Broadcom chips. Keep at mind, and will transport to SoftAAC2 decoder. Let take a look deeper.

<!--more-->

### SoftAAC2

<figure>
	<img src="/images/ndk-acc/VS7-04-AAC-Decord-flow.png" />
	<figcaption>SoftAAC2 decoder stack</figcaption>
</figure>

In the deep level we finally see SoftAAC2 decoder, now it's looks not so simple like "start AAC decoder" isn't it? :) But we finally know how the buffer transfer from decoder to upper of ACodec abstraction. 
Now we know a little about SoftAAC2 (that default software AAC decoder). Now let's expand knowledges about how ADTS AAC packets looks like. This is a good representation of it:

<figure>
	<img src="/images/ndk-acc/VS7-02-AAC-ADTS-hejunlin.png" />
	<figcaption>AAC-ADTS sequence</figcaption>
</figure>

As you see on bottom very important info, that protection_absent flag is very important and based of it header can be 7 bytes or 9 bytes length.
Ok now it is time to talk about main theme of this article - ADTS alignment. 

<figure>
	<img src="/images/ndk-acc/VS7-02-AAC-ADTS-hejunlin_cplit.png" />
	<figcaption>AAC-ADTS align</figcaption>
</figure>

This is very typical example how your receiver can get the buffer, without any knowledge about buffer encoder alignment requirements. So what you can do in such situation when packets not align properly?
Let's realign frames according proper requirements for all decoders to make buffer splitted to complete AAC frame chunks.

### AAC-ADTS align

First of all, lets detect AAC header beginning:

{% highlight cpp linenos %}
if ((0xFF == frameBuffer[offset]) && ((0xF9 == frameBuffer[offset+1]) || (0xF1 == frameBuffer[offset+1])))
{
 // This AAC header start
}
{% endhighlight %}

Now let's detect AAC ES frame size according frame header data:


{% highlight cpp linenos %}
unsigned aac_frame_length =
                    ((frameBuffer[offset+3] & 3) << 11)
                    | (frameBuffer[offset+4] << 3)
                    | (frameBuffer[offset+5] >> 5);
{% endhighlight %}

Where offset can be any lookup counter. It's time to copy the frame data into some buffer struct with size+buffer parts.

{% highlight cpp linenos %}
BufferedFrame aacFrame;
aacFrame.size = aac_frame_length;
// Don't forget to allocate aacFrame.buffer!
memcpy(aacFrame.buffer, frameBuffer + offset, aac_frame_length);
{% endhighlight %}

Continue until you reach the frame end. Don't forget to handle end buffer parts, and concat with new one at endings and beginnings.
Full ADTS alignment algorithm will be follow:

{% highlight cpp linenos %}
ssize_t offset = 0;
vector frames;

// copy_at_end and copy_at_begin - are pseudocode to copy left part of the incomplete buffer 
// and finish it with right part of next buffer chunk

// copy left part of (aac_frame_length - mResSize)
// increase offset += (aac_frame_length - mResSize)
// reset mRes = false;
// Concat partiticial buffers from copy_at_begin with copy_at_end to make complete aac packet
if(mRes)
    copy_at_end(halFrameBuffer + offset, frameBufferSize - offset); // to to some restore buffer

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
            // You can allocate any own buffer array for handle new buffer before!
            aacFrame.buffer = localBuf[num++];
            aacFrame.size = aac_frame_length;
            memcpy(aacFrame.buffer, frameBuffer + offset, aac_frame_length);
            frames.push_back(aacFrame);
            offset += aac_frame_length;
        }
        else
        {
            // mRes, mResSize - global ones
            mRes = true;
            mResSize = frameBufferSize - offset
            copy_at_begin(halFrameBuffer + offset, mResSize); // to to some restore buffer
        }
    }
    else
    {
        offset++;
    }
}
{% endhighlight %}

Algorithm has linear time 
