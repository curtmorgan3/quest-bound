# Quest Bound v2

This is a ground-up, total rebuild of Quest Bound. I’m recapturing my original vision and building it with its open source use in mind. My intention is to make it simpler, more performant and (eventually) more feature rich.

## Why v2?

QB was originally designed to be a distributed, cloud-based web app where many users connect to the same server. Since open sourcing it, the way people actually use it is more similar to a desktop application. To do so, you have to download the source code and run three separate servers with unnecessary infrastructure either through Docker or native services.

v2 is a single progressive web app that runs everything in your browser. You have the option to use it online, or install it as a browser app with 100% offline capabilities. All you have to do is visit https://app.questbound.com. You can do this right now.

## Is it still free and open source?

Yes. All the code for v2 is on a feature branch called `v2`. Once v2 reaches feature parity with v1, it will become the main branch and the current version will be moved to a `v1` branch. v1 will continue to be available, but I won’t contribute to it any further.

## What to expect

I’ve laid out a roadmap for v2’s development. This is my high level vision, but things can always change. As always, your feedback is welcome. I do not have an estimate for how long this will take.

## Contributions

The most important way you can help is try to use it. Report bugs in the bug channel and make feature requests in the feature channel. I may eventually get our fancy reporting system back up and running, but for now we’ll use Discord.

Join the [Quest Bound Discord Server](https://discord.gg/7QGV4muT39)
