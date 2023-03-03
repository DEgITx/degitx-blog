var hostname = "https://blog.degitx.com";
var index = lunr(function () {
    this.field('title')
    this.field('content', {boost: 10})
    this.field('category')
    this.field('tags')
    this.ref('id')
});



    index.add({
      title: "Display color output with C/C++ in windows terminal (fix escape characters color displaying)",
      category: ["general"],
      content: "On windows when you will try to display \\033[0m or \\x1B[31m and so one, instead of getting color in terminal you will get ]31m. On windows 10 and letter it’s pretty easy to fix. You just need to include next code:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n#include &lt;windows.h&gt;\n\nHANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);\nif (hConsole)\n{\n    DWORD consoleMode;\n    GetConsoleMode(hConsole, &amp;consoleMode);\n    SetConsoleMode(hConsole, consoleMode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);\n}\n\n// now you can use color printf()\n\n\n",
      tags: ["C","C++","windows","colors","winapi","text","anscii","escape","chars","\\033[0m"],
      id: 0
    });
    

    index.add({
      title: "AmLogic s805x GXL SoC board bring up",
      category: ["general"],
      content: "One of the previous projects was related to bringing up our newly developed board with the AmLogic s805x SoC CPU board. I will describe how the proccess of bringing up looks like, what was tested and also we will take a look how the AmLogic board flashing proccess is carried out for GXL platform (G12B and more recent are very similar).\nThis is our board:\n\n\n  \n  Our developed Z8 board with AmLogic s805x SoC\n\n\nThe first stage of bringup is to build image for reference board. Our case is p241. We took a113 sources for this. Build p241 reference sources:\n\nBuild image\n\n1\n2\n3\n4\n5\n6\n7\n# You need arm-linux-gnueabihf-gcc and aarch64-linux-gnu-gcc to be installed in system toolchains\n$ sudo apt-get install zlib1g zlib1g-dev\n$ source buildroot/build/setenv.sh\n# Choose “mesongxl_p241_32_kernel49” // 37\n$ ln -s aml-4.9 kernel/aml-3.14\n$ ln -s aml-4.9 hardware/aml-3.14\n$ make\n\n\nAfter the proccess in complete everything will be at output/mesongxl_p241_32_kernel49/images with folowing parts:\n\n\n  boot.img - kernel\n  u-boot.bin - u-boot image\n  rootfs.ext2 - rootfs\n  gxl_p241_v2_1g_buildroot.dtb - dtb (for flashing to dtb partition using dtb.img)\n\n\nFlashing image\n\nSecond step is flashing everything to MMC. The esiest way is to use AmLogic flashing tool called AmLogic USB Burning tool:\n\n\n  \n  AmLogic USB Burning Tool\n\n\nYou must choise builded full image.\n\nIf everything fine you will see the the u-boot loading and kernel start after that\n\n\n  \n  Image boot successful\n\n\nControl/Test USB LED’s\n\nIn our case everything was booted, but some part need aditional verifying. First of this is ethernet leds not work. How to blink them with kernel?\n\n\n  \n  Ethernet LED'S not work\n\n\nThats pretty easy, change the ethernet LED’S with gpio state:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n# It can be re enabled manually using control GPIO commands:\n# GPIO (401 + 14) - green\n# GPIO (401 + 15) - yellow\n\nZ8# echo 415 &gt;/sys/class/gpio/export\nZ8# echo 416 &gt;/sys/class/gpio/export\nZ8# echo out &gt;/sys/class/gpio/gpio415/direction\nZ8# echo out &gt;/sys/class/gpio/gpio416/direction\nZ8# echo 1 &gt;/sys/class/gpio/gpio415/value\nZ8# echo 1 &gt;/sys/class/gpio/gpio416/value\n\n\nWe set gpio direction and writing 1 to value.\n\n\n  \n  Ethernet LED'S works!\n\n\nFix battery time with enabling DS1307 driver\n\nSecond problem is that battery clock is not working from start. Lets try to enable it. We are using DS1307 controller. So let’s apply the followting patch:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\n32\n33\n34\n35\n36\n37\ndiff --git a/arch/arm/configs/meson64_a32_defconfig b/arch/arm/configs/meson64_a32_defconfig\nindex 8e7d5648501a..446e1973c554 100644\n--- a/arch/arm/configs/meson64_a32_defconfig\n+++ b/arch/arm/configs/meson64_a32_defconfig\n@@ -593,3 +593,4 @@ CONFIG_ASYMMETRIC_PUBLIC_KEY_SUBTYPE=y\n CONFIG_X509_CERTIFICATE_PARSER=y\n CONFIG_CRC_T10DIF=y\n CONFIG_CRC7=y\n+RTC_DRV_DS1307=y\ndiff --git a/arch/arm64/boot/dts/amlogic/gxl_p241_v2_1g_buildroot.dts b/arch/arm64/boot/dts/amlogic/gxl_p241_v2_1g_buildroot.dts\nindex bf77a30db461..ba45803a8552 100644\n--- a/arch/arm64/boot/dts/amlogic/gxl_p241_v2_1g_buildroot.dts\n+++ b/arch/arm64/boot/dts/amlogic/gxl_p241_v2_1g_buildroot.dts\n@@ -1359,3 +1359,14 @@\n        delay_control = &lt;0x15&gt;;\n        ssctl = &lt;0&gt;;\n };\n+\n+&amp;i2c0 {\n+       status = \"okay\";\n+       pinctrl-0 = &lt;&amp;a_i2c_master&gt;;\n+       pinctrl-names = \"default\";\n+\n+       rtc: rtc@68 {\n+               compatible = \"dallas,ds1340\";\n+               reg = &lt;0x68&gt;;\n+       };\n+};\ndiff --git a/arch/arm64/configs/meson64_defconfig b/arch/arm64/configs/meson64_defconfig\nindex 968ee40827bc..1367a6cebd19 100644\n--- a/arch/arm64/configs/meson64_defconfig\n+++ b/arch/arm64/configs/meson64_defconfig\n@@ -617,3 +617,4 @@ CONFIG_CRYPTO_GHASH_ARM64_CE=y\n CONFIG_CRYPTO_AES_ARM64_CE_BLK=y\n CONFIG_CRC_T10DIF=y\n CONFIG_CRC7=y\n+RTC_DRV_DS1307=y\n\n\nAnd now test with i2cdump:\n\n1\ni2cdump -f -y 0 0x68\n\n\n\n  \n  Now the time can be readed. The value saved throuth the boot.\n\n\nSound testing\n\nWe done it using speaker-test which is the part of the image\n\n1\n2\n3\n4\n# via audio jack\nZ8# speaker-test -c2 -D hw:0,0\n# via hdmi SPDIF\nZ8# speaker-test -c2 -D hw:0,1\n\n\nLoad testing\n\nLet’s load the system at 100%. One of the effective ways is with bzip2:\n\n1\nZ8# (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;)\n\n\nLet’s increase the load with multiple bzip proccesses and hw deconding playback:\n\n1\n2\n3\n4\n5\n6\nZ8# (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;)\nZ8# (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;); (dd if=/dev/urandom | bzip2 -9 &gt;&gt; /dev/null &amp;)\nZ8# gst-launch-1.0 filesrc location=videoplayback.mp4 ! qtdemux ! h264parse ! amlvdec ! amlvsink\n\n## Verify with top\nZ8# top\n\n\nThe maximum power consumption we got is 0.46A\n\n\n  \n  0.46A Power consumption\n\n\nHardware accelerated decoding\n\nVideo h264 hardware accelerated\n\n1\nZ8# gst-launch-1.0 filesrc location=videoplayback.mp4 ! qtdemux ! h264parse ! amlvdec ! amlvsink\n\n\ngst-launch-1.0 will start video decoding, so you can see video decoding on stream, use\n\n1\nZ8# killall chrome\n\n\nAudio hardware accelerated\n\n1\nZ8# gst-launch-1.0 filesrc location=1.mp3 ! mpegaudioparse ! amladec ! audioconvert ! amlasink\n\n\nTemperature measurements\n\n1\nZ8# cat /sys/class/thermal/thermal_zone*/temp\n\n\nPlay audio file\n\n1\nZ8# aplay -D hw:0,0 -c2 -f cd flower_ok.wav\n\n\nMounting usb drives\n\n1\n2\n3\nZ8# mkdir /media/flash\nZ8# mount -t vfat /dev/sda /media/flash\nZ8# cd /media/flash\n\n\nHDMI tests\n\nWe just simply inseted monitor to verify that everything works :).\n\n",
      tags: ["C","uboot","u-boot","kernel","linux","amlogic","s805x","s905x","board","bringup","dtb","embedded","gpio","DS1307","i2cdump","i2c","gstreamer","alsa","amlvdec","thermal_zone"],
      id: 1
    });
    

    index.add({
      title: "C_INCLUDES must be under the source or output directories",
      category: ["general"],
      content: "“C_INCLUDES must be under the source or output directories” error can indicate the the sources not included under LOCAL_C_INCLUDES\n\n1\n2\n3\nLOCAL_C_INCLUDES += \\\n    $(LOCAL_PATH) \\\n    $(LOCAL_PATH)/src\n\n\nBut at the same time be aware of symlinks! The problem can be if the folder created with symlinks! So aware of them.\n",
      tags: ["C","android","mk","makefile","module","nmake","ninja"],
      id: 2
    });
    

    index.add({
      title: "Mingw full static linkage instead of binary",
      category: ["general"],
      content: "How to avoid usage of libgcc_s_seh-1.dll or libgcc_s_dw2-1.dll ? You need to include following link flags:\n\n1\n-static-libgcc -static-libstdc++ -static\n\n\nIn case of CMake:\n\n1\n2\n3\nif(MINGW)\n    SET(CMAKE_EXE_LINKER_FLAGS  \"${CMAKE_EXE_LINKER_FLAGS} -static-libgcc -static-libstdc++ -static\")\nendif()\n\n",
      tags: ["C++","C","mingw","arch","native","crossplatform","x64_86","x86","cmake","static","shared"],
      id: 3
    });
    

    index.add({
      title: "Crossplatform C++ Arch detection",
      category: ["general"],
      content: "You can simply get current arch usign following code, where on windows can be used GetNativeSystemInfo() and on macos and linux uname() function:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\n32\nstd::string GetOSArch()\n{\n#ifdef CPK_OS_WIN\n    SYSTEM_INFO info;\n    GetNativeSystemInfo(&amp;info);\n    switch (info.wProcessorArchitecture) {\n        case PROCESSOR_ARCHITECTURE_AMD64:\n            return \"x86_64\";\n        case PROCESSOR_ARCHITECTURE_INTEL:\n            return \"x86\";\n        case PROCESSOR_ARCHITECTURE_IA64:\n            return \"ia64\";\n    };\n#endif\n#if defined(CPK_OS_LINUX) || defined(CPK_OS_MACOS)\n    long ret = -1;\n    struct utsname u;\n\n    if (ret == -1)\n        ret = uname(&amp;u);\n    if (ret != -1) {\n        if (strlen(u.machine) == 4 &amp;&amp; u.machine[0] == 'i'\n                &amp;&amp; u.machine[2] == '8' &amp;&amp; u.machine[3] == '6')\n            return std::string(\"x86\");\n        if (strcmp(u.machine, \"amd64\") == 0) // Solaris\n            return std::string(\"x86_64\");\n\n        return std::string(u.machine);\n    }\n#endif\n    return \"\";\n}\n\n\nOS detection can be done for example on cmake side or with other definition like __WIN32:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\nif(WIN32)\n    add_definitions(-DCPK_OS_WIN)\nelse()\n    if (${CMAKE_SYSTEM_NAME} MATCHES \"Darwin\")\n        add_definitions(-DCPK_OS_MACOS)\n    else()\n        add_definitions(-DCPK_OS_LINUX)\n    endif()\nendif()\n\n",
      tags: ["C++","C","mingw","arch","native","crossplatform","x64_86","x86","linux","macos","windows","cmake"],
      id: 4
    });
    

    index.add({
      title: "Missmatch of libstd++ library / _zst28__throw_bad_array_new_lengthv error",
      category: ["general"],
      content: "For example you install new compiler or MinGW C++ and you met error of _zst28__throw_bad_array_new_lengthv after compile time. You can verify you compiler with simple example:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n#include &lt;iostream&gt;\n#include &lt;vector&gt;\n\nusing namespace std;\nint main(void)\n{\n    vector &lt;int&gt; a = {2, 0, 1}; // problem line\n    cout &lt;&lt; \"hellow world\";\n    return 0;\n}\n\n\nIf you still get error on such simple example you have system libstd++ missmatch. Your system is taking this library from some other part of the system (NOT from compiler directory) of the %PATH% location. Edit you PATH variable and make compiler directory (for example: c:\\mingw64\\bin) to be ABOVE the problematic one. Or with other words: compiler directory must have more priority. Very popular problematic place is git - C:\\Git\\mingw64\\bin, move it to the end of %PATH%.\n\nThe error must go away.\n",
      tags: ["C++","C","mingw","error","windows"],
      id: 5
    });
    

    index.add({
      title: "GStreamer H264/MP4 decoding C/C++ basics and encoding/decoding buffers manipulations",
      category: ["general"],
      content: "Exploring GStreamer and pipelines\n\nBefore proceeding to code review, let’s look at what we can do without it.  GStreamer includes useful utilities to work with, in particular:\n\n\n  gst-inspect-1.0 will allow you to see a list of available codecs and modules, so you can immediately see what will do with it and select a set of filters and codecs.\n  gst-launch-1.0 allows you to start any pipeline.\nGStreamer uses a decoding scheme where a stream passes through different components in series, from source to sink output. You can choose anything as a source: a file, a device, the output (sink) also may be a file, a screen, network outputs, and protocols (like RTP).\n\n\nSimple example of using gst-launch-1.0 to connect elements and play audio:\n\n1\ngst-launch-1.0 filesrc location=/path/to/file.ogg ! decodebin ! alsasink\n\n\n\n  \n  How to sink and src works\n\n\nFilesrc will open file, decodebin - decode it, and alsasink will output audio.\n\nAnother more complex example of playing an mp4 file:\n\n1\ngst-launch-1.0 filesrc location=file.mp4 ! qtdemux ! h264parse ! avdec_h264 ! videoconvert ! autovideosink\n\n\nThe input accepts the mp4 file, which goes through the mp4 demuxer — qtdemux, then through the h264 parser, then through the decoder, the converter, and finally, the output.\n\nYou can replace autovideosink with filesink with a file parameter and output the decoded stream directly to the file.\n\nProgramming an application with GStreamer C/C++ API. Let’s try to decode\n\nNow when we know how to use gst-launch-1.0, we are doing the same thing within our application. The principle remains the same: we are building in a decoding pipeline, but now we are using the GStreamer library and glib-events.\n\nWe will consider a live example of H264 decoding.\n\nInitialization of the GStreamer application takes place once with the help of\n\n1\ngst_init (NULL, NULL);\n\n\n\n\nIf you want to see what’s happening in detail, you can set up a logging level before the initialization.\n\n1\n2\ngst_debug_set_active(TRUE);\ngst_debug_set_default_threshold(GST_LEVEL_LOG);\n\n\nNote: no matter how many pipelines you have in your application, it is enough to initialize gst_init once.\n\nLet’s create a new event-loop where events will be processed:\n\n1\n2\nGMainLoop *loop;\nloop = g_main_loop_new (NULL, FALSE);\n\n\nAnd now we can start building our pipeline. Let’s name the necessary elements, in particular, the pipeline itself as the GstElement type:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\nGstElement *pipeline, *source, *demuxer, *parser, *decoder, *conv, *sink;\n \npipeline = gst_pipeline_new (\"video-decoder\");\nsource   = gst_element_factory_make (\"filesrc\",       \"file-source\");\ndemuxer  = gst_element_factory_make (\"qtdemux\",      \"h264-demuxer\");\nparser   = gst_element_factory_make (\"h264parse\",      \"h264-parser\");\ndecoder  = gst_element_factory_make (\"avdec_h264\",     \"h264-decoder\");\nconv     = gst_element_factory_make (\"videoconvert\",  \"converter\");\nsink     = gst_element_factory_make (\"appsink\", \"video-output\");\n\n\nEach element of the pipeline is created via gst_element_factory_make, where the first parameter is the type and the second is its conditional name for GStreamer, on which it will later rely (for example, when issuing errors).\n\nIt would also be nice to check that all components are found otherwise gst_element_factory_make returns NULL.\n\n1\n2\n3\n4\nif (!pipeline || !source || !demuxer || !parser || !decoder || !conv || !sink) {\n    // one element is not initialized - stop\n    return;\n}\n\n\nWe are setting the same location parameter via g_object_set:\n\n1\ng_object_set (G_OBJECT (source), \"location\", argv[1], NULL);\n\n\nOther parameters in other elements can be set in the same way.\n\nNow we need the GStreamer message handler, let’s create the corresponding bus_call:\n\n1\n2\n3\n4\n5\n6\nGstBus *bus;\n \nguint bus_watch_id;\nbus = gst_pipeline_get_bus (GST_PIPELINE (pipeline));\nbus_watch_id = gst_bus_add_watch (bus, bus_call, loop);\ngst_object_unref (bus);\n\n\ngst_object_unref and other similar calls are needed to clear selected objects.\n\nThen we will name the message handler itself:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\nstatic gboolean\nbus_call (GstBus     *bus,\n          GstMessage *msg,\n          gpointer    data)\n{\n  GMainLoop *loop = (GMainLoop *) data;\n  switch (GST_MESSAGE_TYPE (msg)) {\n    case GST_MESSAGE_EOS:\n      LOGI (\"End of stream\\n\");\n      g_main_loop_quit (loop);\n      break;\n  \n    case GST_MESSAGE_ERROR: {\n      gchar  *debug;\n      GError *error;\n \n      gst_message_parse_error (msg, &amp;error, &amp;debug);\n      g_free (debug);\n      LOGE (\"Error: %s\\n\", error-&gt;message);\n      g_error_free (error);\n      g_main_loop_quit (loop);\n      break;\n    }\n \n    default:\n      break;\n  }\n  return TRUE;\n}\n\n\nAnd now the most important thing: we collect and add all the created elements in a single pipeline, which was built through gst-launch. The order of addition is, of course, important:\n\n1\n2\ngst_bin_add_many (GST_BIN (pipeline), source, demuxer, parser, decoder, conv, sink, NULL);\ngst_element_link_many (source, demuxer, parser, decoder, conv, sink, NULL);\n\n\nWe should also note that this linking of elements works perfectly for stream outputs, but in the case of playback (autovideosink) requires additional synchronization and dynamic linking of the demuxer and parser:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\ngst_element_link (source, demuxer);\ngst_element_link_many (parser, decoder, conv, sink, NULL);\ng_signal_connect (demuxer, \"pad-added\", G_CALLBACK (on_pad_added), parser);\n \nstatic void\non_pad_added (GstElement *element,\n              GstPad     *pad,\n              gpointer    data)\n{\n  GstPad *sinkpad;\n  GstElement *decoder = (GstElement *) data;\n \n  /* We can now link this pad with the sink pad */\n  g_print (\"Dynamic pad created, linking demuxer/decoder\\n\");\n  \n  sinkpad = gst_element_get_static_pad (decoder, \"sink\");\n  gst_pad_link (pad, sinkpad);\n  gst_object_unref (sinkpad);\n}\n\n\nA dynamic connection makes it possible to determine the type and number of threads in contrast to a static one and will work in some cases when it is required.\n\nAnd finally, let’s turn the conveyor status into a playback:\n\n1\ngst_element_set_state (pipeline, GST_STATE_PLAYING);\n\n\nAnd let’s run event-loop:\n\n1\ng_main_loop_run (loop);\n\n\nAfter this procedure, everything needs to be cleaned:\n\n1\n2\n3\n4\ngst_element_set_state (pipeline, GST_STATE_NULL);\ngst_object_unref (GST_OBJECT (pipeline));\ng_source_remove (bus_watch_id);\ng_main_loop_unref (loop);\n\n\nChoosing encoders and decoders. Fallbacks.\n\nThere’s more to tell about useful but barely mentioned things in the documentation: how you can easily organize a fallback decoder or encoder.\n\nThe gst_element_factory_find function will help us do this by checking if we have a codec in the elements factory:\n\n1\n2\n3\n4\nif(gst_element_factory_find(\"omxh264dec\"))\n  decoder  = gst_element_factory_make (\"omxh264dec\",     \"h264-decoder\");\nelse\n  decoder  = gst_element_factory_make (\"avdec_h264\",     \"h264-decoder\");\n\n\nIn this example, we have prioritized the selection of an OMX hardware decoder on the RDK platform, and in case of its absence, we will choose a software implementation.\n\nAnother extremely useful but even more rarely used feature is to check what we actually initialized in GstElement (which of many codecs):\n\n1\ngst_plugin_feature_get_name(gst_element_get_factory(encoder));\n\n\nYou can do it in such a simple way and return the name of the initialized codec.\n\nVideo color models\n\nWe can’t help but mention color models as well since we are talking about encoding video from cameras. And that’s when YUV goes on stage (much more often than RGB).\n\nCameras simply love the YUYV color model. But GStreamer likes to work with the usual I420 model much better. If it is not about outputting in the gl-frame, we will also have I420 frames. Get ready to set up the filters you need and perform the transformations.\n\nSome encoders can work with other color models as well, but more often, these are exceptions to the rule.\n\nWe should also note that GStreamer has its own module for receiving video streams from your camera, and it can be used to build a pipeline, but we will talk about it some other time.\n\nLet’s deal with buffers and take data on the fly\n\nInput buffer\n\nIt’s time to deal with the data flows. Until now, we have simply encoded through filesrc what is in the file and displayed everything in the same filesink or on the screen.\n\nNow we will work with the buffers and the appsrc / appsink inputs and outputs. For some reason, this issue was hardly taken into account in the official documentation.\n\nSo how to organize a constant data flow in the created pipelines, or if to be more precise to the output buffer and get an encoded or decoded output buffer? Let’s say we got the image from the camera and we need to encode it. We have already decided that we need a frame in the I420 format. Let’s say we have it, what’s next? How do I pass a picture through the whole pipeline flow?\n\nFirst, let’s set up the need-data event handler, which will be started when it is necessary to feed data into the pipeline and start feeding the input buffer:\n\n1\ng_signal_connect (source, \"need-data\", G_CALLBACK (encoder_cb_need_data), NULL);\n\n\nThe handler itself has the following form:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\nencoder_cb_need_data (GstElement *appsrc,\n                      guint       unused_size,\n                      gpointer    user_data)\n{\n  GstBuffer *buffer;\n  GstFlowReturn ret;\n  GstMapInfo map;\n \n  int size = 1.5 * 640 * 480; // typical I420 640x480 image for example\n  uint8_t* image; // prepared I420 image data (replace with your buffer)\n  \n  // Copy image to the buffer\n  buffer = gst_buffer_new_allocate (NULL, size, NULL);\n  gst_buffer_map (buffer, &amp;map, GST_MAP_WRITE);\n  memcpy((guchar *)map.data, image,  gst_buffer_get_size( buffer ) );\n  gst_buffer_unmap(buffer, &amp;map);\n  g_signal_emit_by_name (appsrc, \"push-buffer\", buffer, &amp;ret);\n  gst_buffer_unref(buffer);\n}\n\n\nYou might say that “image” is the pseudo-code of our image buffer in I420.\n\nNext, we create a buffer of the necessary size through gst_buffer_new_allocate, which will correspond to the size of the image buffer.\n\nWith gst_buffer_map we set the buffer to write mode and use memcpy to copy our image to the created buffer.\n\nAnd finally, we signal GStreamer that the buffer is ready.\n\nNote: it is essential to use gst_buffer_unmap after writing and to clear the buffer after using gst_buffer_unref. Otherwise, there will be a memory leak. In the low number of available examples, no one was particularly concerned about memory usage, although this is very important.\n\nNow, when we are done with the handler, one more thing to do is to configure caps on the receipt of our expected format.\n\nThis is done before installing the need-data signal handler:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\ng_object_set (G_OBJECT (source),\n              \"stream-type\", 0,\n              \"format\", GST_FORMAT_TIME, NULL);\n \ng_object_set (G_OBJECT (source), \"caps\",\n              gst_caps_new_simple (\"video/x-raw\",\n                                   \"format\", G_TYPE_STRING, \"I420\",\n                                   \"width\", G_TYPE_INT, 640,\n                                   \"height\", G_TYPE_INT, 480,\n                                   \"framerate\", GST_TYPE_FRACTION, 30, 1,\n                                   NULL),\n              NULL);\n\n\nLike all GstElement parameters, the parameters are set via g_object_set.\n\nIn this case, we have defined the stream type and its caps — the data format. We are specifying that the appsrc output will receive the I420 data with 640×480 resolution and 30 frames per second.\n\nFrequency in our case, and in general, does not play any role. While working, we haven’t noticed that GStreamer somehow limits need-data calls by frequency.\n\nFinished, now our frames are fed into the encoder.\n\nOutput buffer\n\nNow let’s find out how to get an encoded output stream.\n\nWe connect the handler to the sink pad:\n\n1\n2\n3\nGstPad *pad = gst_element_get_static_pad (sink, \"sink\");\ngst_pad_add_probe  (pad, GST_PAD_PROBE_TYPE_BUFFER, encoder_cb_have_data, NULL, NULL);\ngst_object_unref (pad);\n\n\nSimilarly, we connected to another sink pad event, GST_PAD_PROBE_TYPE_BUFFER, which would be triggered as the data buffer enters the sink pad.\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\nstatic GstPadProbeReturn\nencoder_cb_have_data (GstPad * pad,\n                      GstPadProbeInfo * info,\n                      gpointer user_data) {\n  GstBuffer *buf = gst_pad_probe_info_get_buffer (info);\n  GstMemory *bufMem = gst_buffer_get_memory(buf, 0);\n  GstMapInfo bufInfo;\n \n  gst_memory_map(bufMem, &amp;bufInfo, GST_MAP_READ);\n \n  // bufInfo.data, bufInfo.size will contain encoded image data as output of out pipeline\n  gst_memory_unmap(bufMem, &amp;bufInfo);\n  return GST_PAD_PROBE_OK;\n}\n\n\nThe callback has a similar structure. Now, we need to reach the buffer memory. First, we get GstBuffer, then a pointer of its memory using gst_buffer_get_memory by index 0 (as a rule, it is the only one involved). Finally, using gst_memory_map, we get the data buffer address bufInfo.data and its size bufInfo.size.\n\nUsing same technique you can pass and recive encoded or decoded data with any complex pipeline using decoding elements or encoding elements or even using filters. I will recomend to prepare and test you pipeline using gst-launch-1.0 console utility at first, and then build same pipeline using native code.\n",
      tags: ["gstreamer","C++","native","aac","streaming","video capture"],
      id: 6
    });
    

    index.add({
      title: "Android NDK AAC decoder ADTS alignment",
      category: ["general"],
      content: "After a long thought, I finally decided to switch my blog articles to english, and continue to give some rare and mostly unintresting info in free form. And today we will talk more about Android, NDK and some undocumentated video/audio functionality, maybe will discover some new knowlage about AAC and maybe it will help your own problem, like it was for me.\nIn a focus of this acrticle is Android AAC decoder, and a little detail how the decoding in android working behind NDK documentation.\n\nAMediaCodec using steps\n\nFirst let take a very very surface look how to start decoding using NDK:\n\n  Create AMediaCodec using codec name.\n  Configure AMediaCodec via AMediaCodec_configure.\n  Ctart decoding AMediaCodec_start.\n  Give a buffer using AMediaCodec_getInputBuffer.\n  Back buffer with AMediaCodec_queueInputBuffer.\n  Repeat while you have an buffer ;).\n\n\nLooks very simple, and work good as well. I can end this article in this place, but I don’t tell you nothing about buffer requirenments and other stuffs, and in NDK/SDK also all simple like that. So what going on behind this android decoding? What if you getting some error with your buffer, or you don’t have sound in some rare cases? How the Android decoder works like, let take a look at AAC audio decoder as example. Let’s begin from simple.\n\n\n\t\n\tAndroid AAC decoder architecture\n\n\nAs you see on this bad jpeg picture :) Android have different implementation of AAC decoders as OMX components. But that’s not all, beside some software implemetation on some platforms existed hardware implementation, like on Broadcom chips. Keep at mind, and will transport to SoftAAC2 decoder. Let take a look deeper.\n\n\n\nSoftAAC2\n\n\n\t\n\tSoftAAC2 decoder stack\n\n\nIn the deep level we finally see SoftAAC2 decoder, now it’s looks not so simple like “start AAC decoder” isn’t it? :) But we finally know how the buffer transfer from decoder to upper of ACodec abstraction. \nNow we know a little about SoftAAC2 (that default software AAC decoder). Now let’s expand knowledges about how ADTS AAC packets looks like. This is a good representation of it:\n\n\n\t\n\tAAC-ADTS sequence\n\n\nAs you see on bottom very important info, that protection_absent flag is very important and based of it header can be 7 bytes or 9 bytes length.\nOk now it is time to talk about main theme of this article - ADTS alignment.\n\n\n\t\n\tAAC-ADTS align\n\n\nThis is very typical example how your receiver can get the buffer, without any knowledge about buffer encoder alignment requirements. So what you can do in such situation when packets not align properly?\nLet’s realign frames according proper requirements for all decoders to make buffer splitted to complete AAC frame chunks.\n\nAAC-ADTS align\n\nFirst of all, lets detect AAC header beginning:\n\n1\n2\n3\n4\nif ((0xFF == frameBuffer[offset]) &amp;&amp; ((0xF9 == frameBuffer[offset+1]) || (0xF1 == frameBuffer[offset+1])))\n{\n // This AAC header start\n}\n\n\nNow let’s detect AAC ES frame size according frame header data:\n\n1\n2\n3\n4\nunsigned aac_frame_length =\n                    ((frameBuffer[offset+3] &amp; 3) &lt;&lt; 11)\n                    | (frameBuffer[offset+4] &lt;&lt; 3)\n                    | (frameBuffer[offset+5] &gt;&gt; 5);\n\n\nWhere offset can be any lookup counter. It’s time to copy the frame data into some buffer struct with size+buffer parts.\n\n1\n2\n3\n4\nBufferedFrame aacFrame;\naacFrame.size = aac_frame_length;\n// Don't forget to allocate aacFrame.buffer!\nmemcpy(aacFrame.buffer, frameBuffer + offset, aac_frame_length);\n\n\nContinue until you reach the frame end. Don’t forget to handle end buffer parts, and concat with new one at endings and beginnings.\nFull ADTS alignment algorithm will be follow:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\n32\n33\n34\n35\n36\n37\n38\n39\n40\n41\n42\n43\n44\n45\nssize_t offset = 0;\nvector frames;\n\n// copy_at_end and copy_at_begin - are pseudocode to copy left part of the incomplete buffer \n// and finish it with right part of next buffer chunk\n\n// copy left part of (aac_frame_length - mResSize)\n// increase offset += (aac_frame_length - mResSize)\n// reset mRes = false;\n// Concat partiticial buffers from copy_at_begin with copy_at_end to make complete aac packet\nif(mRes)\n    copy_at_end(halFrameBuffer + offset, frameBufferSize - offset); // to to some restore buffer\n\nwhile(offset &lt; frameBufferSize)\n{\n    if ((0xFF == frameBuffer[offset]) &amp;&amp; ((0xF9 == frameBuffer[offset+1]) || (0xF1 == frameBuffer[offset+1])))\n    {\n        unsigned aac_frame_length =\n                    ((frameBuffer[offset+3] &amp; 3) &lt;&lt; 11)\n                    | (frameBuffer[offset+4] &lt;&lt; 3)\n                    | (frameBuffer[offset+5] &gt;&gt; 5);\n\n        if (offset + aac_frame_length &lt;= frameBufferSize)\n        {\n            BufferedFrame aacFrame;\n            // You can allocate any own buffer array for handle new buffer before!\n            aacFrame.buffer = localBuf[num++];\n            aacFrame.size = aac_frame_length;\n            memcpy(aacFrame.buffer, frameBuffer + offset, aac_frame_length);\n            frames.push_back(aacFrame);\n            offset += aac_frame_length;\n        }\n        else\n        {\n            // mRes, mResSize - global ones\n            mRes = true;\n            mResSize = frameBufferSize - offset\n            copy_at_begin(halFrameBuffer + offset, mResSize); // to to some restore buffer\n        }\n    }\n    else\n    {\n        offset++;\n    }\n}\n\n\nAlgorithm has linear time\n",
      tags: ["android","sdk","ndk","C++","aac","algorithm"],
      id: 7
    });
    

    index.add({
      title: "Send Ctrl+C event to any Windows window",
      category: ["general"],
      content: "In some cases you want close the window on windows with ctrl+c combination, or invoke event for different reasons. On windows you can make such small program:\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n#include &lt;windows.h&gt;\n#include &lt;stdio.h&gt;\n\nint main(int argc, char* argv[])\n{\n int pid = atoi( argv[1] );\n printf(\"kill in console %d\", pid);\n\n FreeConsole();\n if (AttachConsole(pid))\n {\n     SetConsoleCtrlHandler(NULL, true);\n     GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0);\n     FreeConsole();\n     SetConsoleCtrlHandler(NULL, false);\n }\n\n\n return 0;\n}\n\n\nAs argument you can pass a pid or the window proccess. (You can get it via system monitor).\n",
      tags: ["C","C++","WinAPI","Windows","PID","keyboard","keys","event"],
      id: 8
    });
    

    index.add({
      title: "Electron IPC communication. Render and main threads",
      category: ["general"],
      content: "What I often dislike about the standard documentation for many things is that seemingly identical items are separated by a huge layer of unnecessary information, or are generally so poorly documented that it’s faster to find the answer on Stack Overflow. So, if we know what Electron is, and roughly imagine that it consists of a main process controlled by node-js and a browser process (the so-called render process), how do we organize communication between 2 processes?\n\nMain process communication -&gt; Render process (from main to render)\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n// main.process.js - send\n// mainWindow - this is BrowserWindow\nmainWindow.webContents.send('message', data); // отправка\n\n// render.process.js - recive\nimport { ipcRenderer } from 'electron';\nipcRenderer.on('message', (event, data) =&gt; {\n// handle\n});\n\n\nCommunication between Render process -&gt; Main process (from render to main)\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n// main.process.js - recive\nimport { ipcMain } from \"electron\";\nipcMain.on('message', (event, data) =&gt; {\n// handle\n})\n\n// render.process.js - send\nimport { ipcRenderer } from 'electron';\nipcRenderer.send('message', data);\n\n\nglobal object\n\nWhy it was so difficult to collect this information in one place I don’t understand at all.\nThere is also a useful shared global object that is available inside the renderer and is declared in the main process.\n\n1\n2\n3\n4\n5\n6\n// main.process.js\nglobal.a = 1\n\n// render.process.js\nimport { remote } from 'electron';\nremote.getGlobal('a') // 1\n\n\nMaybe someone will find this information useful\n",
      tags: ["JS","Javascript","Electron","IPC","send","recive"],
      id: 9
    });
    

    index.add({
      title: "Hello all in my new blog page",
      category: ["general"],
      content: "Hello everyone this is my updated blog page. Here I will post my post about programming (C/C++/Java/Python), music engineering and other life stuffs. So everyone are welcome.\n",
      tags: ["hello"],
      id: 10
    });
    


var store = [{
    "title": "Display color output with C/C++ in windows terminal (fix escape characters color displaying)",
    "link": "/general/colorful-windows-terminal.html",
    "image": null,
    "date": "March 3, 2023",
    "category": ["general"],
    "excerpt": "On windows when you will try to display \\033[0m or \\x1B[31m and so one, instead of getting color in terminal..."
},{
    "title": "AmLogic s805x GXL SoC board bring up",
    "link": "/general/amlogic_s805x_board.html",
    "image": null,
    "date": "November 15, 2022",
    "category": ["general"],
    "excerpt": "One of the previous projects was related to bringing up our newly developed board with the AmLogic s805x SoC CPU..."
},{
    "title": "C_INCLUDES must be under the source or output directories",
    "link": "/general/c_include_android.html",
    "image": null,
    "date": "September 8, 2022",
    "category": ["general"],
    "excerpt": "“C_INCLUDES must be under the source or output directories” error can indicate the the sources not included under LOCAL_C_INCLUDES 1..."
},{
    "title": "Mingw full static linkage instead of binary",
    "link": "/general/mingw-full-static.html",
    "image": null,
    "date": "July 30, 2022",
    "category": ["general"],
    "excerpt": "How to avoid usage of libgcc_s_seh-1.dll or libgcc_s_dw2-1.dll ? You need to include following link flags: 1 -static-libgcc -static-libstdc++ -static..."
},{
    "title": "Crossplatform C++ Arch detection",
    "link": "/general/crossplatform-arch-detection.html",
    "image": null,
    "date": "July 22, 2022",
    "category": ["general"],
    "excerpt": "You can simply get current arch usign following code, where on windows can be used GetNativeSystemInfo() and on macos and..."
},{
    "title": "Missmatch of libstd++ library / _zst28__throw_bad_array_new_lengthv error",
    "link": "/general/glibc-mingw-missmatch.html",
    "image": null,
    "date": "May 27, 2022",
    "category": ["general"],
    "excerpt": "For example you install new compiler or MinGW C++ and you met error of _zst28__throw_bad_array_new_lengthv after compile time. You can..."
},{
    "title": "GStreamer H264/MP4 decoding C/C++ basics and encoding/decoding buffers manipulations",
    "link": "/general/gstreamer-h264-capture.html",
    "image": null,
    "date": "October 22, 2020",
    "category": ["general"],
    "excerpt": "Exploring GStreamer and pipelines Before proceeding to code review, let’s look at what we can do without it. GStreamer includes..."
},{
    "title": "Android NDK AAC decoder ADTS alignment",
    "link": "/general/android-ndk-aac.html",
    "image": null,
    "date": "July 15, 2020",
    "category": ["general"],
    "excerpt": "After a long thought, I finally decided to switch my blog articles to english, and continue to give some rare..."
},{
    "title": "Send Ctrl+C event to any Windows window",
    "link": "/general/c-ctrlc.html",
    "image": null,
    "date": "February 3, 2018",
    "category": ["general"],
    "excerpt": "In some cases you want close the window on windows with ctrl+c combination, or invoke event for different reasons. On..."
},{
    "title": "Electron IPC communication. Render and main threads",
    "link": "/general/electron-ipc.html",
    "image": null,
    "date": "January 31, 2018",
    "category": ["general"],
    "excerpt": "What I often dislike about the standard documentation for many things is that seemingly identical items are separated by a..."
},{
    "title": "Hello all in my new blog page",
    "link": "/general/hello-all.html",
    "image": null,
    "date": "April 15, 2012",
    "category": ["general"],
    "excerpt": "Hello everyone this is my updated blog page. Here I will post my post about programming (C/C++/Java/Python), music engineering and..."
}]

$(document).ready(function() {
    $('#search-input').on('keyup', function () {
        var resultdiv = $('#results-container');
        if (!resultdiv.is(':visible'))
            resultdiv.show();
        var query = $(this).val();
        var result = index.search(query);
        resultdiv.empty();
        $('.show-results-count').text(result.length + ' Results');
        for (var item in result) {
            var ref = result[item].ref;
            var searchitem = '<li><a href="'+ hostname + store[ref].link+'">'+store[ref].title+'</a></li>';
            resultdiv.append(searchitem);
        }
    });
});