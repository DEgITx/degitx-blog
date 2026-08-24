---
title: "librats vs libp2p: what a 5 MB peer-to-peer node buys you"
seoTitle: "librats vs js-libp2p: a P2P benchmark"
description: "Benchmarking librats, my C++ peer-to-peer library, against js-libp2p: 22x less memory, a 9.3x small-message gap, and a dead heat on bulk throughput."
pubDate: 2026-08-23
tags:
  - "C++"
  - "P2P"
  - "Networking"
  - "librats"
  - "Benchmark"
  - "Native"
---

Every few years I end up needing the same thing: two processes, on two arbitrary machines, behind two arbitrary routers, talking to each other securely with nobody in the middle. It came up in [rats-search](https://github.com/librats/rats-search), it came up again in a remote-desktop project, and both times I ended up gluing a DHT to some NAT traversal to some crypto by hand and hoping the seams held.

[librats](https://github.com/DEgITx/librats) is what happened when I finally sat down and did it once, properly, as a library. It's C++, with C, Node.js, Java, Python and Android bindings over the same core, and the whole point of it is to be small enough that putting peer-to-peer into an application is not an architectural decision.

The question I get, reasonably, is *why not just use libp2p*. So this year I stopped hand-waving and measured it.

## Why I didn't just use libp2p

I tried it first, and what stopped me wasn't an argument, it was watching it run.

I had a node up with a not-very-large number of peers and a DHT search going, on a laptop that isn't especially strong, and the CPU pegged at 100%. Memory was worse — I re-read the figure a couple of times because I assumed I had leaked something myself. For a workload that is fundamentally some Kademlia lookups and a stream of small messages, none of it added up. Whatever I was paying for, most of it wasn't work I had asked for. That's an impression rather than a measurement — the rest of this post is me going back and measuring it — but it's the reason I started writing code instead of reading docs.

The second thing was languages. libp2p isn't a library, it's a specification with implementations, and those implementations are nowhere near equal. Go and JavaScript are the real ones, Rust is close behind. The C++ side was closer to a placeholder than to something I would ship, and I needed C++ — dropped into a desktop application, cross-compiled for Android and for cheap ARM boxes, shipped as a single binary. "Pick libp2p" in practice meant "pick Go or JavaScript", which is not a language decision I wanted the networking library to make for me.

librats is the other arrangement. There is one implementation, in C++, and one C ABI underneath everything else; the Node.js, Java, Python and Android bindings are thin FFI layers over that same core. So they aren't tiers. Whatever the C++ API can do, the Python one can do, on the same code, with the same behaviour — there is no "the good implementation" and "the other ones".

The third thing is that I don't need interop. Reaching any other libp2p node over any transport either side happens to support is what multistream-select, the muxer negotiation and the transport zoo are there to buy. If you need that, nothing else will do. I don't: I want *my* application's peers to find *my* application's peers, and I'm paying for a negotiation whose outcome is known before it starts.

librats takes the other side of that trade. There is nothing to negotiate: your application's protocol id is bound into the Noise handshake prologue, so a node from a different application doesn't get told "no", it fails to complete the handshake at all. One round trip instead of four.

## What the thing actually is

A `Node` is a secure transport and nothing else — an encrypted channel, a self-certifying identity, manual dialing, raw channel messaging. Everything above that is a subsystem you attach explicitly before `start()`:

```cpp
librats::NodeConfig config;
config.listen_port = 8080;
librats::Node node(config);

node.add_subsystem(std::make_unique<librats::PubSub>());
node.add_subsystem(std::make_unique<librats::DhtDiscovery>(dht_config));

node.start();
```

The parts I'd defend as genuinely different:

* **TCP and UDP as equals, on the same port.** The UDP side is a real ordered/reliable stream — sequencing, cumulative and selective acks, RFC 6298 retransmission timing, Reno congestion control — over one socket shared by every peer. That's what keeps a NAT holding *one* mapping instead of one per peer, and it's the only reason hole punching works at all. A dial tries UDP first and races TCP alongside it, so a UDP-hostile network still connects.
* **Identity is the key.** Every node has a Curve25519 keypair and its `PeerId` *is* the public key. No PKI, no CA, no bootstrap of trust — both sides prove possession during Noise_XX or the connection doesn't exist.
* **The DHT is the BitTorrent mainline DHT.** Kademlia, BEP 5, IPv4 and IPv6. It joins a network with millions of live nodes instead of needing its own populated overlay. That's a bootstrap story libp2p's kad-dht simply doesn't have, and it's the one thing I'd have written librats for on its own.

And a number that says most of what "lightweight" means here: a whole statically linked P2P node — DHT, NAT traversal, crypto, the lot — is **916 KB**, and `ldd` on it prints libc, libstdc++, libm and the loader. Nothing else. The js-libp2p benchmark peer, for comparison, resolves **139 npm packages and 66 MB of files** from 8 direct dependencies.

## Measuring it without fooling myself

Two P2P libraries never agree on what a "connection" or a "message" is, so the harness gives every library the same five scenarios, the same wire, the same pacing and the same instruments, and treats whatever is left over as a difference between the libraries. The rules that mattered:

* **Same wire.** librats prefers UDP; the head-to-head runs TCP on both sides so the comparison isn't smuggling in a transport difference. UDP is reported separately as an extra data point.
* **Same pacing, swept.** Both sides pace with an application credit window rather than each library's own backpressure signal — pacing on those compares the signals, not the transports. More on this below, because it turned out to matter more than anything else.
* **Nobody spins.** The C++ sender blocks on a condition variable, the JS senders `await`. A spin-wait charges librats CPU that a single-threaded Node peer structurally cannot spend, and CPU-per-gigabyte is a headline number.
* **CPU is both ends summed**, read by each peer from its own `getrusage` / `process.cpuUsage()`, with process boot excluded.
* Three runs per cell, median reported. Nobody logs.

Intel Core Ultra 7 265KF, 36 GB, Linux, GCC 15.2 `-O3 -DNDEBUG`, Node.js v24.18.0, js-libp2p 3.3.8, TCP + Noise_XX on both sides, over loopback. That last word is a real caveat and I'll come back to it.

## Footprint

This is the part that isn't close.

<figure class="chart">
<svg viewBox="0 0 720 386" width="720" height="386" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>Resident memory, idle and under load. The two panels share a scale, so the length of a bar means the same thing in both.</title>
  <line x1="151.5" y1="237" x2="151.5" y2="364" stroke="var(--color-border)" stroke-width="1"/>
  <line x1="151.5" y1="42" x2="151.5" y2="169" stroke="var(--color-border)" stroke-width="1"/>
  <text x="0" y="12" font-size="13" font-weight="600" fill="var(--color-fg)">Resident memory — node up, no peers</text>
  <text x="720" y="12" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↓ lower is better</text>
  <text x="0" y="30" font-size="11" fill="var(--color-fg-subtle)">VmRSS of the listener, 3 s after it starts listening</text>
  <text x="140" y="57" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 42H163.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="176.0" y="57" font-size="11.5" font-weight="600" fill="var(--color-fg)">5.0 MB</text>
  <text x="140" y="92" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 77H163.4a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="176.4" y="92" font-size="11.5" font-weight="600" fill="var(--color-fg)">5.2 MB</text>
  <text x="140" y="127" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 112H312.8a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="325.8" y="127" font-size="11.5" font-weight="600" fill="var(--color-fg)">55.3 MB</text>
  <text x="140" y="162" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 147H478.5a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="491.5" y="162" font-size="11.5" font-weight="600" fill="var(--color-fg)">110.9 MB</text>
  <text x="0" y="207" font-size="13" font-weight="600" fill="var(--color-fg)">Resident memory — holding 100 encrypted peers</text>
  <text x="720" y="207" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↓ lower is better</text>
  <text x="0" y="225" font-size="11" fill="var(--color-fg-subtle)">Same process, same scale, 100 inbound connections from 100 distinct identities</text>
  <text x="140" y="252" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 237H165.4a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="178.4" y="252" font-size="11.5" font-weight="600" fill="var(--color-fg)">5.8 MB</text>
  <text x="140" y="287" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 272H167.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="180.0" y="287" font-size="11.5" font-weight="600" fill="var(--color-fg)">6.4 MB</text>
  <text x="140" y="322" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 307H317.2a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="330.2" y="322" font-size="11.5" font-weight="600" fill="var(--color-fg)">56.8 MB</text>
  <text x="140" y="357" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 342H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="633.0" y="357" font-size="11.5" font-weight="600" fill="var(--color-fg)">158.4 MB</text>
  <text x="152" y="384" font-size="10.5" fill="var(--color-fg-subtle)">Both panels share one scale, so a bar means the same thing in each.</text>
</svg>
<figcaption>Resident memory, idle and under load. The two panels share a scale, so the length of a bar means the same thing in both.</figcaption>
</figure>

Five megabytes to be a running, listening, encrypted P2P node. A hundred and eleven for js-libp2p to do the same. With a hundred peers connected the gap widens rather than narrows, because the two sides are also paying very different amounts *per peer*:

<figure class="chart">
<svg viewBox="0 0 720 191" width="720" height="191" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>Marginal cost of a connected peer: 8 KB against 475 KB, a factor of 59.</title>
  <line x1="151.5" y1="42" x2="151.5" y2="169" stroke="var(--color-border)" stroke-width="1"/>
  <text x="0" y="12" font-size="13" font-weight="600" fill="var(--color-fg)">What one more peer costs</text>
  <text x="720" y="12" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↓ lower is better</text>
  <text x="0" y="30" font-size="11" fill="var(--color-fg-subtle)">(RSS with 100 peers − RSS idle) ÷ 100</text>
  <text x="140" y="57" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 42H156.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="169.0" y="57" font-size="11.5" font-weight="600" fill="var(--color-fg)">8.1 KB</text>
  <text x="140" y="92" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 77H159.7a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="172.7" y="92" font-size="11.5" font-weight="600" fill="var(--color-fg)">11.8 KB</text>
  <text x="140" y="127" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 112H162.9a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="175.9" y="127" font-size="11.5" font-weight="600" fill="var(--color-fg)">15.0 KB</text>
  <text x="140" y="162" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 147H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="633.0" y="162" font-size="11.5" font-weight="600" fill="var(--color-fg)">475.1 KB</text>
  <text x="152" y="189" font-size="10.5" fill="var(--color-fg-subtle)">Linear scale — the librats bars really are that short.</text>
</svg>
<figcaption>Marginal cost of a connected peer: 8 KB against 475 KB, a factor of 59.</figcaption>
</figure>

Eight kilobytes against four hundred and seventy-five. That is the number I care about most, because it's the one that decides whether an idea is possible on a router, a set-top box or a Raspberry Pi. A thousand peers costs librats about 8 MB of connection state; the same thousand peers costs js-libp2p about 475 MB, which on most of the hardware I care about is simply the end of the conversation.

<figure class="chart">
<svg viewBox="0 0 720 386" width="720" height="386" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>Startup and connection setup. A libp2p dial negotiates its way through four round trips; librats binds the protocol into the handshake and negotiates nothing.</title>
  <line x1="151.5" y1="259" x2="151.5" y2="386" stroke="var(--color-border)" stroke-width="1"/>
  <line x1="151.5" y1="42" x2="151.5" y2="169" stroke="var(--color-border)" stroke-width="1"/>
  <text x="0" y="12" font-size="13" font-weight="600" fill="var(--color-fg)">Cold start — exec() to a listening node</text>
  <text x="720" y="12" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↓ lower is better</text>
  <text x="0" y="30" font-size="11" fill="var(--color-fg-subtle)">What a CLI, a short-lived worker or a desktop app pays before it can do anything</text>
  <text x="140" y="57" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 42H200.5a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="213.5" y="57" font-size="11.5" font-weight="600" fill="var(--color-fg)">21 ms</text>
  <text x="140" y="92" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 77H212.1a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="225.1" y="92" font-size="11.5" font-weight="600" fill="var(--color-fg)">26 ms</text>
  <text x="140" y="127" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 112H203.5a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="216.5" y="127" font-size="11.5" font-weight="600" fill="var(--color-fg)">22 ms</text>
  <text x="140" y="162" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 147H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="633.0" y="162" font-size="11.5" font-weight="600" fill="var(--color-fg)">188 ms</text>
  <text x="152" y="189" font-size="10.5" fill="var(--color-fg-subtle)">Measured from exec() to the READY line, Node.js boot included.</text>
  <text x="0" y="229" font-size="13" font-weight="600" fill="var(--color-fg)">Connection setup rate — 100 cold peers</text>
  <text x="720" y="229" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↑ higher is better</text>
  <text x="0" y="247" font-size="11" fill="var(--color-fg-subtle)">100 distinct identities dialing one listener, encrypted handshake included</text>
  <text x="140" y="274" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 259H510.9a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="523.9" y="274" font-size="11.5" font-weight="600" fill="var(--color-fg)">1 746 /s</text>
  <text x="140" y="309" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 294H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="633.0" y="309" font-size="11.5" font-weight="600" fill="var(--color-fg)">2 271 /s</text>
  <text x="140" y="344" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 329H313.2a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="326.2" y="344" font-size="11.5" font-weight="600" fill="var(--color-fg)">795 /s</text>
  <text x="140" y="379" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 364H213.8a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="226.8" y="379" font-size="11.5" font-weight="600" fill="var(--color-fg)">317 /s</text>
</svg>
<figcaption>Startup and connection setup. A libp2p dial negotiates its way through four round trips; librats binds the protocol into the handshake and negotiates nothing.</figcaption>
</figure>

Cold start is the one people underrate. If your P2P node lives inside a CLI, a short-lived worker or a desktop app the user launches, 188 ms of startup is 188 ms the user watches. Both Node figures include booting Node itself, which makes the comparison between them the interesting one: the librats addon is up in 22 ms, so what js-libp2p is spending is very largely the cost of resolving and evaluating that 139-package module graph before a node exists at all.

The connection-setup gap has a structural explanation rather than an implementation one. By spec, a libp2p TCP connection takes four round trips: TCP handshake, multistream-select for the security protocol, the Noise handshake, then muxer negotiation. [Early muxer negotiation](https://libp2p.io/docs/early-negotiation/) saves one of them, and there's ongoing work on replacing multistream-select. librats negotiates nothing, so it's one handshake and you're connected. That's a design difference rather than an implementation-quality one, and it is not the kind of thing you optimise your way out of — you can't negotiate less than nothing.

## Throughput is not the interesting number

One row in this study is not a win for librats, and I'd rather point at it myself:

<figure class="chart">
<svg viewBox="0 0 720 408" width="720" height="408" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>The same pair of libraries: a dead heat on bulk, a 9.3x gap on small messages. Peak bandwidth and per-message cost are different questions.</title>
  <line x1="151.5" y1="259" x2="151.5" y2="386" stroke="var(--color-border)" stroke-width="1"/>
  <line x1="151.5" y1="42" x2="151.5" y2="169" stroke="var(--color-border)" stroke-width="1"/>
  <text x="0" y="12" font-size="13" font-weight="600" fill="var(--color-fg)">Bulk throughput — 256 MB in 64 KiB frames</text>
  <text x="720" y="12" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↑ higher is better</text>
  <text x="0" y="30" font-size="11" fill="var(--color-fg-subtle)">Encrypted, over loopback, timed by the receiver between its own stamps</text>
  <text x="140" y="57" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 42H617.7a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="630.7" y="57" font-size="11.5" font-weight="600" fill="var(--color-fg)">600 MB/s</text>
  <text x="140" y="92" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 77H407.5a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="420.5" y="92" font-size="11.5" font-weight="600" fill="var(--color-fg)">332 MB/s</text>
  <text x="140" y="127" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 112H262.6a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="275.6" y="127" font-size="11.5" font-weight="600" fill="var(--color-fg)">146 MB/s</text>
  <text x="140" y="162" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 147H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="633.0" y="162" font-size="11.5" font-weight="600" fill="var(--color-fg)">603 MB/s</text>
  <text x="152" y="189" font-size="10.5" fill="var(--color-fg-subtle)">Run-to-run variance is ±3–5 %, so the top two bars are a tie, not a ranking.</text>
  <text x="0" y="229" font-size="13" font-weight="600" fill="var(--color-fg)">Small messages — 200 000 × 256 B</text>
  <text x="720" y="229" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↑ higher is better</text>
  <text x="0" y="247" font-size="11" fill="var(--color-fg-subtle)">Messages per second actually delivered to the receiving application</text>
  <text x="140" y="274" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 259H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="633.0" y="274" font-size="11.5" font-weight="600" fill="var(--color-fg)">863 517 /s</text>
  <text x="140" y="309" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 294H543.6a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="556.6" y="309" font-size="11.5" font-weight="600" fill="var(--color-fg)">723 835 /s</text>
  <text x="140" y="344" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 329H241.7a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="254.7" y="344" font-size="11.5" font-weight="600" fill="var(--color-fg)">171 342 /s</text>
  <text x="140" y="379" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 364H198.7a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="211.7" y="379" font-size="11.5" font-weight="600" fill="var(--color-fg)">92 711 /s</text>
  <text x="152" y="406" font-size="10.5" fill="var(--color-fg-subtle)">Same two libraries, same wire, same pacing as the panel above.</text>
</svg>
<figcaption>The same pair of libraries: a dead heat on bulk, a 9.3x gap on small messages. Peak bandwidth and per-message cost are different questions.</figcaption>
</figure>

Bulk is a **tie**. Run-to-run variance is ±3–5%, 600 against 603 is noise, and anyone reporting that as a win is selling something. What is not a tie is the small-message row: 863k against 93k, a factor of 9.3, with the same two libraries on the same wire in the same run.

That difference is the whole story, because most peer-to-peer traffic is not bulk. It's gossip, presence, DHT queries, control messages, tiny state updates — hundreds of thousands of small things, not a handful of big ones. Per-message cost is what a P2P node actually pays.

<figure class="chart">
<svg viewBox="0 0 720 581" width="720" height="581" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>CPU per unit of work — the figures that survive the move off loopback, because they are costs rather than rates.</title>
  <line x1="151.5" y1="432" x2="151.5" y2="559" stroke="var(--color-border)" stroke-width="1"/>
  <line x1="151.5" y1="237" x2="151.5" y2="364" stroke="var(--color-border)" stroke-width="1"/>
  <line x1="151.5" y1="42" x2="151.5" y2="169" stroke="var(--color-border)" stroke-width="1"/>
  <text x="0" y="12" font-size="13" font-weight="600" fill="var(--color-fg)">CPU per handshake</text>
  <text x="720" y="12" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↓ lower is better</text>
  <text x="0" y="30" font-size="11" fill="var(--color-fg-subtle)">Both peers summed</text>
  <text x="140" y="57" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 42H230.6a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="243.6" y="57" font-size="11.5" font-weight="600" fill="var(--color-fg)">1.61 ms</text>
  <text x="140" y="92" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 77H220.4a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="233.4" y="92" font-size="11.5" font-weight="600" fill="var(--color-fg)">1.41 ms</text>
  <text x="140" y="127" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 112H368.6a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="381.6" y="127" font-size="11.5" font-weight="600" fill="var(--color-fg)">4.29 ms</text>
  <text x="140" y="162" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 147H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="633.0" y="162" font-size="11.5" font-weight="600" fill="var(--color-fg)">9.19 ms</text>
  <text x="0" y="207" font-size="13" font-weight="600" fill="var(--color-fg)">CPU per 256-byte message</text>
  <text x="720" y="207" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↓ lower is better</text>
  <text x="0" y="225" font-size="11" fill="var(--color-fg-subtle)">Both peers summed</text>
  <text x="140" y="252" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 237H193.9a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="206.9" y="252" font-size="11.5" font-weight="600" fill="var(--color-fg)">2.27 µs</text>
  <text x="140" y="287" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 272H203.3a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="216.3" y="287" font-size="11.5" font-weight="600" fill="var(--color-fg)">2.74 µs</text>
  <text x="140" y="322" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 307H415.9a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="428.9" y="322" font-size="11.5" font-weight="600" fill="var(--color-fg)">13.27 µs</text>
  <text x="140" y="357" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 342H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="633.0" y="357" font-size="11.5" font-weight="600" fill="var(--color-fg)">23.38 µs</text>
  <text x="0" y="402" font-size="13" font-weight="600" fill="var(--color-fg)">CPU per gigabyte moved</text>
  <text x="720" y="402" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↓ lower is better</text>
  <text x="0" y="420" font-size="11" fill="var(--color-fg-subtle)">Both peers summed</text>
  <text x="140" y="447" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / TCP</text>
  <path d="M152 432H257.5a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-1)"/>
  <text x="270.5" y="447" font-size="11.5" font-weight="600" fill="var(--color-fg)">3.27 s</text>
  <text x="140" y="482" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — C++ / UDP</text>
  <path d="M152 467H330.2a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-3)"/>
  <text x="343.2" y="482" font-size="11.5" font-weight="600" fill="var(--color-fg)">5.44 s</text>
  <text x="140" y="517" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">librats — Node.js</text>
  <path d="M152 502H620.0a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-7)"/>
  <text x="633.0" y="517" font-size="11.5" font-weight="600" fill="var(--color-fg)">14.10 s</text>
  <text x="140" y="552" font-size="11.5" text-anchor="end" fill="var(--color-fg-muted)">js-libp2p — Node.js</text>
  <path d="M152 537H304.8a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4H152Z" fill="var(--chart-2)"/>
  <text x="317.8" y="552" font-size="11.5" font-weight="600" fill="var(--color-fg)">4.68 s</text>
  <text x="152" y="579" font-size="10.5" fill="var(--color-fg-subtle)">Neither side is allowed to spin-wait — that would charge CPU a JS peer cannot spend.</text>
</svg>
<figcaption>CPU per unit of work — the figures that survive the move off loopback, because they are costs rather than rates.</figcaption>
</figure>

There's a detail in the bulk column I find more convincing than the throughput tie itself. librats' ChaCha20-Poly1305 runs at **721 MB/s** on this machine — portable C, no AVX assembly, benchmarked at parity with the noise-c reference it was ported from. Node reaches OpenSSL's vectorised implementation, which is meaningfully faster. Both stacks are cipher-bound at these frame sizes. So librats matches js-libp2p's bulk throughput *while running a measurably slower cipher*, which means its non-crypto overhead is much lower — and it does it at 3.27 CPU-seconds per gigabyte against 4.68.

Worth noting the other direction too: during the bulk transfer the js-libp2p listener used about 0.99 CPU-seconds over 0.44 s of wall clock, i.e. more than one core. Node spreads GC and libuv work across threads; librats' single reactor thread does not. Part of that throughput parity is bought with more cores.

## Three numbers that were wrong first

I want to spend a section on this, because the first numbers this study produced were wrong — one by 2.8x, one by 20x, and one in a way no ratio captures — and every one of them looked completely plausible.

**The first bulk number was 68 MB/s for librats, against 419 for js-libp2p.** It looked like a rout. It was the harness: I was pacing on librats' own writable signal, which produced a send-one-frame / wait / send-one-frame ping-pong that spent 3.2 seconds of a 3.88-second run waiting. Switching to an application credit window fixed the ping-pong but left the ack cadence as a free variable, and that variable turned out to be enormous:

<figure class="chart">
<svg viewBox="0 0 720 262" width="720" height="262" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>The first bulk number this study produced was 68 MB/s for librats. Almost all of the difference turned out to be the harness, not the library.</title>
  <text x="0" y="14" font-size="13" font-weight="600" fill="var(--color-fg)">One knob, a 2.8x swing — and it is not in either library</text>
  <text x="720" y="14" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">↑ higher is better</text>
  <text x="0" y="32" font-size="11" fill="var(--color-fg-subtle)">Bulk throughput against the pacing cadence of the harness. Same code on both sides of every point.</text>
  <line x1="52" y1="216.0" x2="692" y2="216.0" stroke="var(--color-border)" stroke-width="1"/>
  <text x="42" y="220.0" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">0</text>
  <line x1="52" y1="177.5" x2="692" y2="177.5" stroke="var(--color-border)" stroke-width="1"/>
  <text x="42" y="181.5" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">175</text>
  <line x1="52" y1="139.0" x2="692" y2="139.0" stroke="var(--color-border)" stroke-width="1"/>
  <text x="42" y="143.0" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">350</text>
  <line x1="52" y1="100.5" x2="692" y2="100.5" stroke="var(--color-border)" stroke-width="1"/>
  <text x="42" y="104.5" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">525</text>
  <line x1="52" y1="62.0" x2="692" y2="62.0" stroke="var(--color-border)" stroke-width="1"/>
  <text x="42" y="66.0" font-size="10.5" text-anchor="end" fill="var(--color-fg-subtle)">700</text>
  <text x="0" y="50.0" font-size="10.5" fill="var(--color-fg-subtle)">MB/s</text>
  <line x1="52" y1="83.6" x2="692" y2="83.6" stroke="var(--chart-2)" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round"/>
  <text x="66" y="73.2" font-size="11" fill="var(--color-fg-muted)">js-libp2p — flat at 596–608 MB/s across the same sweep</text>
  <path d="M52.0 168.3 L212.0 135.5 L372.0 84.4 L532.0 82.5 L692.0 85.8" fill="none" stroke="var(--chart-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="52.0" cy="168.3" r="4.5" fill="var(--chart-1)" stroke="var(--color-bg)" stroke-width="2"/>
  <circle cx="212.0" cy="135.5" r="4.5" fill="var(--chart-1)" stroke="var(--color-bg)" stroke-width="2"/>
  <circle cx="372.0" cy="84.4" r="4.5" fill="var(--chart-1)" stroke="var(--color-bg)" stroke-width="2"/>
  <circle cx="532.0" cy="82.5" r="4.5" fill="var(--chart-1)" stroke="var(--color-bg)" stroke-width="2"/>
  <circle cx="692.0" cy="85.8" r="4.5" fill="var(--chart-1)" stroke="var(--color-bg)" stroke-width="2"/>
  <text x="64.0" y="173.3" font-size="11" font-weight="600" fill="var(--color-fg)">217 MB/s</text>
  <text x="532.0" y="69.5" font-size="11" font-weight="600" text-anchor="middle" fill="var(--color-fg)">607 MB/s</text>
  <text x="225.0" y="155.5" font-size="11" fill="var(--color-fg-muted)">librats — C++ / TCP, one ack cadence per point</text>
  <text x="52.0" y="236.0" font-size="10.5" text-anchor="middle" fill="var(--color-fg-subtle)">4</text>
  <text x="212.0" y="236.0" font-size="10.5" text-anchor="middle" fill="var(--color-fg-subtle)">8</text>
  <text x="372.0" y="236.0" font-size="10.5" text-anchor="middle" fill="var(--color-fg-subtle)">16</text>
  <text x="532.0" y="236.0" font-size="10.5" text-anchor="middle" fill="var(--color-fg-subtle)">32</text>
  <text x="692.0" y="236.0" font-size="10.5" text-anchor="middle" fill="var(--color-fg-subtle)">64</text>
  <text x="372.0" y="254.0" font-size="10.5" text-anchor="middle" fill="var(--color-fg-subtle)">acknowledgements per 4 MiB credit window</text>
</svg>
<figcaption>The first bulk number this study produced was 68 MB/s for librats. Almost all of the difference turned out to be the harness, not the library.</figcaption>
</figure>

A 2.8x swing with no change to either library, on a knob that lives in the *measuring instrument*. js-libp2p barely moved across the same sweep, so any single fixed cadence would have handicapped librats specifically. The fix is to sweep it and report every library at its own best — the one setting nobody can be accused of being disadvantaged by. The generalisation, which I'd now apply to any cross-library transport benchmark I read: **flow-control configuration is not a neutral setting, and a benchmark that doesn't report its pacing isn't interpretable.**

**The first handshake run reported js-libp2p at 100.9 connections/s.** In fact 5 of 100 dials succeeded and the rate was computed over those 5. js-libp2p ships `INBOUND_CONNECTION_THRESHOLD = 5` — inbound connections per second, per source IP — and on a loopback rig all 100 dialing identities share one source IP. A guard aimed at attackers fired on my measurement setup. Raised for the recorded runs, it gives 317/s.

It's also a feature librats doesn't have: it caps `max_peers` and nothing finer. That one is on my list.

**And a quiet one.** js-libp2p's stream API is message-shaped — you `send(bytes)`, the peer gets a `'message'` event — which invites the assumption that one send is one message. It isn't guaranteed. Probing it directly: 200 sends of 65,537 bytes arrived as **201 events**, one message split into 65,533 + 4. It first showed up as byte counts twenty short of what was sent, which is small enough to dismiss as noise. That's exactly what makes it dangerous. The libp2p peer now length-prefixes its own stream, and that framing cost is included in its results, because a real application would have to pay it too. librats' frame layer delivers whole messages on a named channel, so there's nothing to do — that's an API-level difference, not a performance one.

## Where librats loses

Three things, and I'd rather name them myself than have you find them:

* **No cross-implementation interop.** librats talks to librats. If you need to reach the IPFS network or somebody else's node, this is the wrong library and there's no clever workaround.
* **No browser transports.** No WebRTC, no WebTransport. That's a category of application librats can't serve today, and it's the gap I'd close first.
* **No QUIC** — though librats' own reliable stream over UDP already covers most of what I'd want QUIC for, on one shared socket, which is the part that matters for NAT.

## Where this sits among the others

The honest framing of everything above is **librats versus js-libp2p**, with the word *JavaScript* left in. It says nothing about the other implementations:

* **go-libp2p** is the rematch I want most — it's the implementation people usually mean, and the one I'd expect to make the best showing. There was no Go toolchain on that machine, and none for **rust-libp2p** either. One data point while we wait: go-libp2p's resource manager defaults to a **1 MB per-connection** memory limit. librats measures 8 KB.
* **cpp-libp2p** is the comparison that would settle how much of the gap is "C++ beats JavaScript" and how much is design. Everything above is confounded by that, and I'd rather say so than let the charts imply otherwise.
* **Hyperswarm** couldn't be measured on a single-host rig at all: its `connect()` is a DHT rendezvous by public key rather than an address dial, so reaching a peer means also measuring a DHT lookup. That's a gap in the study, not a verdict on the library.

One more number that has nothing to do with libp2p and everything to do with what it's like to work in these libraries: creating 100 js-libp2p nodes in one process takes about **63 seconds**. A hundred librats nodes take about one. That's load-generator cost, not a benchmark result, but it's the kind of thing you feel every day.

## So what would I actually reach for

| | |
|:--|:--|
| Need to reach libp2p nodes, IPFS, or browsers | libp2p — that is exactly what it's for |
| Embedding P2P in a C++/Qt/Electron application | librats |
| Router, set-top box, Android, anything with a memory budget | librats — the per-peer number decides it on its own |
| Mostly small messages: gossip, presence, control traffic | librats |
| Want the existing mainline DHT instead of bootstrapping your own overlay | librats |
| Want Python, Java or Node to get the same feature set as C++ | librats |

And the caveat I'd want attached to every chart above: these are **loopback** numbers on one machine. No propagation delay, no loss, no reordering, no MTU, no middlebox — every congestion controller involved sits in slow start and never leaves it. Throughput here is a floor on cost, not a prediction of a network. The figures that survive a real path are the per-unit ones: CPU per gigabyte, CPU per message, bytes per peer. Those are the ones I'd read first, and they're the ones librats wins by the widest margin.

