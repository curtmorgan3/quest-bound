# Quest Bound

Quest Bound is a free and open source engine for creating digital tabletop role playing games. This repo contains all of its source code, its open source license and terms of use.

<img width="3240" height="842" alt="qb" src="https://github.com/user-attachments/assets/bb9a241d-9d17-4e03-8f58-56d4802e1552" />

---------

Join our [Discord Server](https://discord.gg/Zx2jR5Q3zN) to share ideas and troubleshoot issues.

Contribute to the documentation [here](https://github.com/curtmorgan3/quest-bound-docs).

---------

## License
Quest Bound is free and open source under a strong copy left license. That means you can use and share Quest Bound freely.

You **may** (and should!)
- Freely download and use Quest Bound on your personal computer
- Freely use Quest Bound on [https://app.questbound.com](https://app.questbound.com)
- Share Quest Bound's source code or links to this site with friends

You **may not**
- Include Quest Bound's source code in your application unlesss that application has the same free and open source license and gives proper attribution
- Share content, including PDFs of games you've purchased, as Quest Bound rulesets

Quest Bound lets you build automated tools for your games and includes the ability to upload PDFs for quick reference. Refer to the license of the game you purchases to understand
your limitations on digitally reporducing and sharing that game.

You can find Quest Bound's full license on the right hand side of this page, or in the root directory of the source code.

## Installing

### Install Online
The easiest and recommended way to use Quest Bound is by navigating to [https://app.questbound.com](https://app.questbound.com). Using QB online is free and only requires you to register your email address.

Quest Bound is a *progressive web app* that can be optionally installed on your computer. You'll see an option on the sign in page to install it.

<img width="425" height="168" alt="Screenshot 2026-02-06 at 7 28 47 AM" src="https://github.com/user-attachments/assets/4179a132-bc29-4aca-ad86-4206ed28c920" />

Installing QB will let you launch it as a native application on your laptop or tablet. This is the recommended way to use it. Whether you install it or not, using Quest Bound does *not require an internet connection to work*. If you don't install it, you'll need the internet to initially connect to `app.questbound.com`, but may be disconnected after it loads in your browser. 

### Run from Source
Alternatively, you may download the source code and run a local web server on your computer. To do so, you must have [Node v >= 22](https://nodejs.org/en/download) installed. 

Download and unzip or use git to clone the source code in this repo. From the root, run

```
npm install && npm run build
```

You only need to run that command once to set up Quest Bound. After that, stat it with

```
npm run start
```

To get the latest updates, redownload the zip file and repeat the process or, if you have git installed, run 

```
git pull && npm install && npm run build
```

You will not lose your content after updating.

## Providing Feedback
Please report bugs, feature requests and general feedback on the [issues page](https://github.com/curtmorgan3/quest-bound/issues).

You can find a help channel on our [Discord server](https://discord.gg/Zx2jR5Q3zN).

## Legacy Version
You can find the original version of Quest Bound on the `legacy` branch of this repo. This version requires you to run separate applications for its server and client, as well as have PostgreSQL, Node and Redis available on your computer. Alternatively, the legacy version can be run through Docker. 

The legacy version will remain availble indefinitely, but it will not be developed any further. It's recommended you use this version of Quest Bound instead. 
