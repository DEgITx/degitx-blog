---
title: "Electron IPC communication: main and renderer processes"
seoTitle: "Electron IPC: main and renderer communication"
description: "How to set up two-way IPC between Electron's main and renderer processes: ipcMain, ipcRenderer, webContents.send and synchronous vs asynchronous replies."
pubDate: 2018-01-31
tags:
  - "JavaScript"
  - "Electron"
  - "IPC"
---

What I often dislike about the official documentation is that closely related things are separated by a huge layer of unnecessary information, or are documented so poorly that it’s faster to find the answer on Stack Overflow. So, assuming we know what Electron is and roughly imagine that it consists of a main process driven by Node.js and a browser process (the so-called renderer process), how do we organize communication between the two?

## Main process -> renderer process (from main to renderer)

```js
// main.process.js - send
// mainWindow - this is BrowserWindow
mainWindow.webContents.send('message', data); // send

// render.process.js - receive
import { ipcRenderer } from 'electron';
ipcRenderer.on('message', (event, data) => {
// handle
});
```

## Renderer process -> main process (from renderer to main)

```js
// main.process.js - receive
import { ipcMain } from "electron";
ipcMain.on('message', (event, data) => {
// handle
})

// render.process.js - send
import { ipcRenderer } from 'electron';
ipcRenderer.send('message', data);
```

## The global object

Why it was so hard to collect this information in one place, I still don’t understand.
There is also a useful shared global object: it is declared in the main process and is available inside the renderer.

```js
// main.process.js
global.a = 1

// render.process.js
import { remote } from 'electron';
remote.getGlobal('a') // 1
```

Hopefully someone will find this useful.
