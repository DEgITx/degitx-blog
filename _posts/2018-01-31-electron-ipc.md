---
layout: post
date: 2018-01-31 11:32 PM
title: "Electron IPC communication. Render and main threads"
description: Electron render/main thread communication.
comments: true
category: 
- general
tags:
- JS
- Javascript
- Electron
- IPC
- send
- recive
---
What I often dislike about the standard documentation for many things is that seemingly identical items are separated by a huge layer of unnecessary information, or are generally so poorly documented that it’s faster to find the answer on Stack Overflow. So, if we know what Electron is, and roughly imagine that it consists of a main process controlled by node-js and a browser process (the so-called render process), how do we organize communication between 2 processes?

### Main process communication -> Render process (from main to render)

{% highlight js linenos %}
// main.process.js - send
// mainWindow - this is BrowserWindow
mainWindow.webContents.send('message', data); // отправка

// render.process.js - recive
import { ipcRenderer } from 'electron';
ipcRenderer.on('message', (event, data) => {
// handle
});
{% endhighlight %}

### Communication between Render process -> Main process (from render to main)

{% highlight js linenos %}
// main.process.js - recive
import { ipcMain } from "electron";
ipcMain.on('message', (event, data) => {
// handle
})

// render.process.js - send
import { ipcRenderer } from 'electron';
ipcRenderer.send('message', data);
{% endhighlight %}

### global object

Why it was so difficult to collect this information in one place I don’t understand at all.
There is also a useful shared global object that is available inside the renderer and is declared in the main process.


{% highlight js linenos %}
// main.process.js
global.a = 1

// render.process.js
import { remote } from 'electron';
remote.getGlobal('a') // 1
{% endhighlight %}

Maybe someone will find this information useful
