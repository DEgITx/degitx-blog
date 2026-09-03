---
title: "Meet librats: a small peer-to-peer networking library for C++, Node.js, Python and Android"
seoTitle: "librats: a lightweight P2P library for C++ and more"
description: "librats is an MIT-licensed peer-to-peer library: encrypted transport, mainline DHT discovery, NAT traversal and pub/sub in 5 MB for C++, Node.js, Python and Android."
pubDate: 2026-06-14
updatedDate: 2026-09-03
tags:
  - "C++"
  - "P2P"
  - "Networking"
  - "librats"
  - "Node.js"
  - "Python"
  - "Android"
  - "Native"
---

Most of the software I write ends up on two machines that need to talk to each other. A desktop app and the same app on a laptop at home. A remote-desktop viewer and the box it controls. A search index that thousands of strangers keep alive together. Every one of those has the same shape: process A wants a secure connection to process B, and both of them sit behind a home router that was never asked for its opinion.

For the last twenty years the honest answer has been "rent a server". You put a relay somewhere, both sides connect *out* to it, and the server forwards bytes. It works, and it turns a program into a service you pay for every month, whether or not anyone is using it.

[librats](https://github.com/DEgITx/librats) is my attempt to make the *other* answer cheap enough to be the default. It is a peer-to-peer networking library, MIT licensed, written in C++, with bindings for C, Node.js, Java/Android, Python and React Native, plus an iOS build of the core. A node that discovers peers over the BitTorrent DHT, punches through NAT and talks over an encrypted channel fits in about five megabytes of memory and under a megabyte of binary. This post is the introduction I wish had existed when I started: what it is, how it compares to the things you may already know, and how to get two nodes talking in ten minutes.

## What "peer-to-peer library" means here

The phrase gets used for very different things, so let me pin it down. librats gives you:

* **Direct connections between two programs**, wherever they run, encrypted end to end. The library finds a way through the routers in between: port forwarding via UPnP or NAT-PMP, UDP hole punching when that fails, and a relay through a third peer as a last resort.
* **A way to find peers without a server.** Locally over mDNS, globally over the [BitTorrent mainline DHT](https://www.bittorrent.org/beps/bep_0005.html), which is already running on millions of machines and does not care that your application is not a torrent client.
* **Things to say once connected**: raw messages on named channels, typed JSON messages, publish/subscribe topics that gossip across the mesh, and file or directory transfer with integrity checks.

It does *not* give you a blockchain, a token, a content-addressed file system or a browser transport. It is infrastructure for applications, in the same sense that a TCP socket is infrastructure, just with the last twenty years of "but my users are behind NAT" folded in.

## Where it sits next to what you already know

The easiest way to place a new library is against the ones you have already used. Here is where librats lands, honestly, including the cases where the other tool is the right choice.

| If you know… | librats is… |
|:--|:--|
| **libp2p** (IPFS, Ethereum, Filecoin) | The same idea, one implementation instead of a spec: no transport negotiation, no protocol zoo, about 22x less memory. But it only talks to other librats nodes. If you need to reach the IPFS network, use libp2p. [I measured the two side by side](/blog/librats-vs-libp2p/). |
| **WebRTC** | WebRTC is NAT traversal and encryption for browsers, and it needs a signaling server you write yourself. librats does the signaling through the DHT and the mesh, but does not run in a browser. Native apps only. |
| **ZeroMQ / nanomsg / NNG** | Those are messaging patterns over sockets you can already reach. librats starts one layer lower: it gets you the connection in the first place, across NAT, and gives you pub/sub on top of it. |
| **Hyperswarm** (Holepunch, Pear) | The closest cousin: DHT-based discovery by key, hole punching, encrypted streams. Hyperswarm is JavaScript first; librats is C++ first, with the JavaScript binding sitting on the same native core as the C++ API. |
| **MQTT** | MQTT is pub/sub through a broker. librats' GossipSub is pub/sub *without* a broker: every subscriber is part of the mesh and messages relay across hops. |
| **ENet / RakNet / GameNetworkingSockets** | Reliable UDP for games. librats' UDP transport is in the same family (ordered, reliable, congestion controlled) but shares one socket across all peers, which is what makes NAT hole punching work, and adds discovery and crypto. |
| **Tailscale / WireGuard / ZeroTier** | A mesh VPN moves *the whole machine* onto a private network and needs a coordination server (or your own headscale). librats connects *one application* and needs nothing. |
| **Syncthing / BitTorrent** | Finished applications. librats is the library you would use to build one. The file transfer subsystem is what a Syncthing clone would start from. |
| **gRPC / REST** | Client talks to server. librats is for when there is no server, or when you would rather not run one. |

The pattern in that table: most of the well-known tools either assume a browser, assume a server, or assume JavaScript or Go. librats is for the native application that wants none of those assumptions.

## The design, in five decisions

I could list features, but the features fall out of a handful of decisions, and the decisions are what will tell you whether the library fits your problem.

### A node is a transport, everything else is a plug-in

A bare `Node` does one thing: an encrypted connection to another node, with manual dialing and raw messages on named channels. Discovery, pub/sub, JSON messaging, file transfer, port mapping, hole punching, reconnection, liveness probing are each a *subsystem* you attach before `start()`.

```cpp
librats::NodeConfig config;
config.listen_port = 8080;
librats::Node node(config);

node.add_subsystem(std::make_unique<librats::MdnsDiscovery>());
node.add_subsystem(std::make_unique<librats::PubSub>());

node.start();
```

You pay for what you attach, the core stays small enough to read in an afternoon, and there is no framework lifecycle to learn. A subsystem is a class with three virtual methods, `attach()`, `start()` and `stop()`, and it reaches the rest of the node only through the context it is handed, which is also what makes it easy to write your own.

### Your identity is your key

Every node generates a Curve25519 keypair, and its `PeerId` *is* the public key. There is no certificate authority, no account server, no "sign in". When two nodes connect they run a [Noise_XX](https://noiseprotocol.org/) handshake, both prove they hold the private key behind the id they claim, and the session is encrypted with ChaCha20-Poly1305 with fresh ephemeral keys each time. Point the node at a `data_dir` and the key persists, so the id survives restarts and other peers can remember you.

This is the same trust model as SSH keys, WireGuard and Hyperswarm, and it is the one that actually works without infrastructure.

### Your application's name is part of the handshake

`config.protocol = "myapp/1.0"` is bound into the Noise handshake prologue. Two nodes with different protocol strings do not exchange an error message; the cryptography fails and the connection never exists. It is a one-line private network. It also means librats never negotiates *which* protocol to speak, which is where a libp2p dial spends three of its four round trips.

### UDP and TCP are equals on the same port

Both transports are on by default and bind the same port. UDP is tried first and TCP races alongside it as a fallback, so a network that blocks UDP still connects. The UDP side is not a lossy datagram shortcut: it is a full ordered, reliable stream with selective acknowledgements, RFC 6298 retransmission timing and Reno congestion control, and it runs over *one* socket shared by every peer.

That last part is the whole reason to bother. A NAT holds one mapping for the node instead of one per connection, the port a remote peer sees is the port it can dial back, and that is what makes hole punching possible at all. Nothing above the transport can tell which wire a peer is on; same framing, same handshake, same guarantees.

### Discovery rides the biggest DHT that already exists

Building your own Kademlia overlay means bootstrapping it: running seed nodes, keeping them up, hoping the network reaches critical mass. librats instead speaks the BitTorrent mainline DHT, IPv4 and IPv6, and announces your application under a hash derived from its protocol id. Your two peers find each other through a network of millions of nodes that were there before your app existed and will be there after. For a LAN, mDNS finds peers in under a second with no DHT at all, and Peer Exchange grows the mesh from whatever you already have.

## What happens when the router says no

NAT traversal is the part of P2P everyone underestimates, so it deserves its own section. librats runs a ladder, and each rung is a subsystem:

1. **`PortMappingService`** asks the router to forward the listen port over UPnP IGD and NAT-PMP at the same time. Whichever protocol the router supports wins. Mappings are refreshed and removed on `stop()`. On a typical home router this alone makes the node dialable.
2. **`HolePunch`** covers the routers that refuse. Two peers who cannot dial each other agree, through a peer both already know, to send their first packet at the same instant. Each outbound packet opens the mapping the other one needs. The moment is timed from the round trip itself, so there is no clock synchronisation and no STUN server; the node learns its own external address from what its peers observe.
3. **`Relay`** is the last rung, for symmetric NATs and networks that drop UDP and block inbound TCP. A third node carries the *byte stream*. The Noise handshake still runs end to end, so the relay moves ciphertext it cannot read. A relayed connection keeps trying to upgrade itself to a direct one, and when that lands, the route swaps without a disconnect.

Attach `PeerExchange` next to `HolePunch` and the discovery half handles itself: when PEX learns a peer whose address will not dial, it hands the id to the hole puncher. There is nothing to wire. `node.nat_status()` will also tell you which kind of NAT you are behind, from several peers' independent views of your socket, which is handy to show in a settings panel.

## Ten minutes to two talking nodes

Everything here is on Linux, macOS or Windows with CMake 3.10+ and a C++ compiler. There are no dependencies to install: librats builds from a clean checkout with nothing but the standard library and the platform sockets.

### Build the library and the examples

```bash
git clone https://github.com/DEgITx/librats.git
cd librats
cmake -B build -DCMAKE_BUILD_TYPE=Release -DRATS_BUILD_EXAMPLES=ON
cmake --build build -j
```

On Windows the same two `cmake` commands work from a Visual Studio or MinGW prompt.

### Run the batteries-included chat

The `full_chat` example attaches DHT, mDNS and PEX discovery, reconnection, ping and pub/sub. Nobody types an address:

```bash
./build/bin/examples/full_chat 9000 lobby     # terminal 1
./build/bin/examples/full_chat 9001 lobby     # terminal 2
```

On the same machine or the same LAN they find each other over mDNS in a second or two. Run one of them on a different network and they find each other over the DHT in somewhere between one and thirty seconds, which is the DHT's normal announce-and-lookup rhythm. Type in one terminal and it shows up in the other. That is the whole demo, and it is also most of what a real application needs.

### The smallest program that matters

Here is a complete chat node in C++. Callbacks are registered before `start()` because they run on the library's reactor thread:

```cpp
#include <librats/node/node.h>
#include <librats/subsystems/mdns_discovery.h>
#include <iostream>

using namespace librats;

int main(int argc, char** argv) {
    NodeConfig config;
    config.listen_port = argc > 1 ? std::stoi(argv[1]) : 0;   // 0 = pick a free port
    config.protocol    = "hello-rats/1.0";                    // our private network
    config.data_dir    = "./state";                           // keep the same PeerId across runs

    Node node(config);
    node.add_subsystem(std::make_unique<MdnsDiscovery>());

    node.on_peer_connected([](const Peer& peer) {
        std::cout << "[+] " << peer.id().short_hex() << "\n";
    });
    node.on("chat", [](const Peer& peer, ByteView data) {
        std::cout << peer.id().short_hex() << ": "
                  << std::string_view(reinterpret_cast<const char*>(data.data()), data.size()) << "\n";
    });

    if (!node.start()) return 1;
    std::cout << "I am " << node.local_id().short_hex() << " on port " << node.listen_port() << "\n";

    std::string line;
    while (std::getline(std::cin, line))
        node.broadcast("chat", ByteView(line));

    node.stop();
}
```

Link against the `rats` target and you are done. From CMake the whole integration is one `FetchContent` block:

```cmake
include(FetchContent)
FetchContent_Declare(librats
    GIT_REPOSITORY https://github.com/DEgITx/librats.git
    GIT_TAG        master)
set(RATS_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(RATS_BUILD_CLIENT OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(librats)

target_link_libraries(my_app PRIVATE rats)
```

If you would rather not build from source, librats is in the official [vcpkg](https://vcpkg.io/en/package/librats) registry as `vcpkg install librats`, after which `find_package(rats CONFIG REQUIRED)` and `rats::rats` do the rest.

### The same node from Node.js

The npm package is an N-API addon over the same C core, so it is the same node, not a port of it. It compiles the library on install and needs Node 20+, CMake and a C++ toolchain:

```bash
npm install librats
```

```javascript
const { RatsNode } = require('librats');

const node = new RatsNode({ listenPort: 9000, protocol: 'hello-rats/1.0', dataDir: './state' });

node.onPeerConnected((peerId) => console.log('[+]', peerId));
node.on('chat', (peerId, data) => console.log(peerId, data.toString('utf8')));
node.enableMdns();
node.enableDht();

node.start();
node.broadcast('chat', 'hello from Node.js');
```

Callbacks are marshalled onto the JavaScript thread, so you can touch your app state from them directly. This is the binding I use from Electron: the Node side handles the UI, the native side handles the network, and the renderer never sees a socket. I wrote about that split in [Electron IPC communication](/blog/electron-ipc/).

### And from Python

The Python package drives the C ABI through `ctypes` and reads like Python. It needs the shared build of the library next to it, which `build.py` produces:

```bash
cd python
python build.py --build-native
pip install -e .
```

```python
from librats_py import RatsNode

with RatsNode(9000, protocol="hello-rats/1.0", data_dir="./state") as node:
    node.on_peer_connected(lambda peer: print("[+]", peer))
    node.on("chat", lambda peer, data: print(peer, data.decode()))
    node.enable_mdns()
    node.start()
    node.broadcast("chat", b"hello from Python")
    input()
```

The C++ node, the Node.js node and the Python node above all speak the same protocol and will happily chat with each other, because all three *are* the same node.

## What people build with it

Concrete uses beat abstract ones, so here are the ones I know about.

* **[rats-search](https://github.com/librats/rats-search)** is a BitTorrent search engine where the index lives on the users' machines, with no central server. It is the project librats was extracted from, and it is why the DHT stack is as hardened as it is.
* **[UltraVNC](https://github.com/ultravnc/ultravnc-librats)** uses librats to connect a viewer to a remote desktop through NAT without a repeater server in the middle.
* **[rasync](https://github.com/librats/rasync)** keeps directories identical across machines, both ways, over librats connections, using the rsync rolling checksum to move only the parts of a file that changed. Think Syncthing, with the network layer taken from a library instead of written by hand.

The shapes that fit well, whether or not anyone has built them yet: syncing state between a user's own devices, LAN party and small-group game lobbies, a fleet of edge devices that need to talk to each other rather than to a cloud, chat and collaboration tools that work when the office internet does not, and anything on a Raspberry Pi or a router where a 150 MB Node runtime is simply not an option.

## The numbers, briefly

I keep the full [benchmark against js-libp2p](/blog/librats-vs-libp2p/) in its own post, with the methodology and the places where librats does not win. The shape of it:

| | librats | js-libp2p |
|:--|--:|--:|
| Memory, node started | 5.0 MB | 110.9 MB |
| Memory per connected peer | 8 KB | 475 KB |
| Cold start to listening | 21 ms | 188 ms |
| Small messages (256 B) per second | 863 k | 93 k |
| Bulk throughput | 600 MB/s | 603 MB/s |
| Runtime dependencies | none | 139 packages |

Bulk is a tie, and I would be suspicious of anyone who claimed otherwise. The rows that matter for a P2P application are the per-peer and per-message ones, because gossip, presence and DHT traffic are thousands of small things, not one big one. A thousand connected peers costs librats about 8 MB. That number is the difference between "runs on a set-top box" and "does not".

One more that has nothing to do with speed: a statically linked node with everything attached is under a megabyte, and `ldd` on it prints libc, libstdc++, libm and the loader. If you have ever shipped a Windows binary and wondered which DLL will be missing on the customer's machine, you know why I care. It is the same reason I wrote up [full static linking with MinGW](/blog/mingw-full-static/) years ago.

## What it is not good at

I would rather you hear this from me than discover it after a week.

* **No browsers.** There is no WebRTC or WebTransport, so a librats node cannot be reached from a web page. Native desktop, mobile and server only. This is the gap I most want to close.
* **No interop.** librats talks to librats. If your requirement is "join the IPFS network" or "connect to someone else's libp2p node", this is the wrong library.
* **Young bindings at the edges.** C++, C, Node.js, Java/Android and Python are complete. React Native and iOS build and work but do not yet cover discovery. Rust, Go and C# are planned, not shipped.

## Where to go next

* The [GitHub repository](https://github.com/DEgITx/librats) has the full README, the API reference and the `examples/` directory, one capability per file.
* [librats.com](https://librats.com) is the project site.
* The npm package is [librats](https://www.npmjs.com/package/librats); the vcpkg port is `librats`.
* The [benchmark post](/blog/librats-vs-libp2p/) is where to go if the numbers above made you sceptical, because it is also where I explain how the first numbers I got were wrong.

If you build something with it, open an issue or a pull request and tell me. The library exists because I got tired of renting servers for programs that should have been able to find each other on their own, and every application that proves that point is the reason to keep going.
