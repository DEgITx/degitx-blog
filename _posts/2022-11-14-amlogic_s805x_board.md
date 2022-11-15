---
layout: post
date: 2022-11-15 00:05 AM
title: "AmLogic s805x GXL SoC board bring up"
description: Describing proccess of AmLogic s805x based board bringup with testing examples and real cases. Audio/Video/Power/USB/HDMI and other tests.
comments: true
category: 
- general
tags:
- C
- uboot
- u-boot
- kernel
- linux
- amlogic
- s805x
- s905x
- board
- bringup
- dtb
- embedded
- gpio
- DS1307
- i2cdump
- i2c
- gstreamer
- alsa
- amlvdec
- thermal_zone
---
One of the previous projects was related to bringing up our newly developed board with the AmLogic s805x SoC CPU board. I will describe how the proccess of bringing up looks like, what was tested and also we will take a look how the AmLogic board flashing proccess is carried out for GXL platform (G12B and more recent are very similar).
This is our board:

<figure>
  <img src="/images/s805x/1.png" />
  <figcaption>Our developed Z8 board with AmLogic s805x SoC</figcaption>
</figure>

The first stage of bringup is to build image for reference board. Our case is p241. We took a113 sources for this. Build p241 reference sources:

## Build image

{% highlight bash linenos %}
# You need arm-linux-gnueabihf-gcc and aarch64-linux-gnu-gcc to be installed in system toolchains
$ sudo apt-get install zlib1g zlib1g-dev
$ source buildroot/build/setenv.sh
# Choose “mesongxl_p241_32_kernel49” // 37
$ ln -s aml-4.9 kernel/aml-3.14
$ ln -s aml-4.9 hardware/aml-3.14
$ make
{% endhighlight %}

After the proccess in complete everything will be at output/mesongxl_p241_32_kernel49/images with folowing parts:
<!--more-->
* boot.img - kernel
* u-boot.bin - u-boot image
* rootfs.ext2 - rootfs
* gxl_p241_v2_1g_buildroot.dtb - dtb (for flashing to dtb partition using dtb.img)

## Flashing image

Second step is flashing everything to MMC. The esiest way is to use AmLogic flashing tool called *AmLogic USB Burning tool*:

<figure>
  <img src="/images/s805x/2.png" />
  <figcaption>AmLogic USB Burning Tool</figcaption>
</figure>

You must choise builded full image.

If everything fine you will see the the u-boot loading and kernel start after that

<figure>
  <img src="/images/s805x/3.png" />
  <figcaption>Image boot successful</figcaption>
</figure>

## Control/Test USB LED's

In our case everything was booted, but some part need aditional verifying. First of this is ethernet leds not work. How to blink them with kernel?

<figure>
  <img src="/images/s805x/4.png" />
  <figcaption>Ethernet LED'S not work</figcaption>
</figure>

Thats pretty easy, change the ethernet LED'S with gpio state:

{% highlight bash linenos %}
# It can be re enabled manually using control GPIO commands:
# GPIO (401 + 14) - green
# GPIO (401 + 15) - yellow

Z8# echo 415 >/sys/class/gpio/export
Z8# echo 416 >/sys/class/gpio/export
Z8# echo out >/sys/class/gpio/gpio415/direction
Z8# echo out >/sys/class/gpio/gpio416/direction
Z8# echo 1 >/sys/class/gpio/gpio415/value
Z8# echo 1 >/sys/class/gpio/gpio416/value
{% endhighlight %}

We set gpio direction and writing 1 to value.

<figure>
  <img src="/images/s805x/5.png" />
  <figcaption>Ethernet LED'S works!</figcaption>
</figure>

## Fix battery time with enabling DS1307 driver

Second problem is that battery clock is not working from start. Lets try to enable it. We are using DS1307 controller. So let's apply the followting patch:

{% highlight patch linenos %}
diff --git a/arch/arm/configs/meson64_a32_defconfig b/arch/arm/configs/meson64_a32_defconfig
index 8e7d5648501a..446e1973c554 100644
--- a/arch/arm/configs/meson64_a32_defconfig
+++ b/arch/arm/configs/meson64_a32_defconfig
@@ -593,3 +593,4 @@ CONFIG_ASYMMETRIC_PUBLIC_KEY_SUBTYPE=y
 CONFIG_X509_CERTIFICATE_PARSER=y
 CONFIG_CRC_T10DIF=y
 CONFIG_CRC7=y
+RTC_DRV_DS1307=y
diff --git a/arch/arm64/boot/dts/amlogic/gxl_p241_v2_1g_buildroot.dts b/arch/arm64/boot/dts/amlogic/gxl_p241_v2_1g_buildroot.dts
index bf77a30db461..ba45803a8552 100644
--- a/arch/arm64/boot/dts/amlogic/gxl_p241_v2_1g_buildroot.dts
+++ b/arch/arm64/boot/dts/amlogic/gxl_p241_v2_1g_buildroot.dts
@@ -1359,3 +1359,14 @@
        delay_control = <0x15>;
        ssctl = <0>;
 };
+
+&i2c0 {
+       status = "okay";
+       pinctrl-0 = <&a_i2c_master>;
+       pinctrl-names = "default";
+
+       rtc: rtc@68 {
+               compatible = "dallas,ds1340";
+               reg = <0x68>;
+       };
+};
diff --git a/arch/arm64/configs/meson64_defconfig b/arch/arm64/configs/meson64_defconfig
index 968ee40827bc..1367a6cebd19 100644
--- a/arch/arm64/configs/meson64_defconfig
+++ b/arch/arm64/configs/meson64_defconfig
@@ -617,3 +617,4 @@ CONFIG_CRYPTO_GHASH_ARM64_CE=y
 CONFIG_CRYPTO_AES_ARM64_CE_BLK=y
 CONFIG_CRC_T10DIF=y
 CONFIG_CRC7=y
+RTC_DRV_DS1307=y
{% endhighlight %}

And now test with i2cdump:

{% highlight bash linenos %}
i2cdump -f -y 0 0x68
{% endhighlight %}

<figure>
  <img src="/images/s805x/6.png" />
  <figcaption>Now the time can be readed. The value saved throuth the boot.</figcaption>
</figure>

## Sound testing

We done it using speaker-test which is the part of the image

{% highlight bash linenos %}
# via audio jack
Z8# speaker-test -c2 -D hw:0,0
# via hdmi SPDIF
Z8# speaker-test -c2 -D hw:0,1
{% endhighlight %}

## Load testing

Let's load the system at 100%. One of the effective ways is with bzip2:

{% highlight bash linenos %}
Z8# (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &)
{% endhighlight %}

Let's increase the load with multiple bzip proccesses and hw deconding playback:

{% highlight bash linenos %}
Z8# (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &)
Z8# (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &); (dd if=/dev/urandom | bzip2 -9 >> /dev/null &)
Z8# gst-launch-1.0 filesrc location=videoplayback.mp4 ! qtdemux ! h264parse ! amlvdec ! amlvsink

## Verify with top
Z8# top
{% endhighlight %}

The maximum power consumption we got is 0.46A

<figure>
  <img src="/images/s805x/7.png" />
  <figcaption>0.46A Power consumption</figcaption>
</figure>

## Hardware accelerated decoding

### Video h264 hardware accelerated

{% highlight bash linenos %}
Z8# gst-launch-1.0 filesrc location=videoplayback.mp4 ! qtdemux ! h264parse ! amlvdec ! amlvsink
{% endhighlight %}

gst-launch-1.0 will start video decoding, so you can see video decoding on stream, use

{% highlight bash linenos %}
Z8# killall chrome
{% endhighlight %}

### Audio hardware accelerated

{% highlight bash linenos %}
Z8# gst-launch-1.0 filesrc location=1.mp3 ! mpegaudioparse ! amladec ! audioconvert ! amlasink
{% endhighlight %}

## Temperature measurements

{% highlight bash linenos %}
Z8# cat /sys/class/thermal/thermal_zone*/temp
{% endhighlight %}

## Play audio file

{% highlight bash linenos %}
Z8# aplay -D hw:0,0 -c2 -f cd flower_ok.wav
{% endhighlight %}

## Mounting usb drives

{% highlight bash linenos %}
Z8# mkdir /media/flash
Z8# mount -t vfat /dev/sda /media/flash
Z8# cd /media/flash
{% endhighlight %}

## HDMI tests

We just simply inseted monitor to verify that everything works :).


