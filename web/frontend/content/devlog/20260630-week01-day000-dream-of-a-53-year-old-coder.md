---
title: Dream of a 53-Year-Old Coder
date: 2026-06-30
tag: Week 01 · Day 0
summary: A dream four decades old, an "AI dev team," and the tech stack behind a zero-hand-written-code game.
---

(This Day 0 is a bit fake. I actually had this idea at the end of April 2026, then I posted about it and got discouraged, so I spent 9 days doing Ricochet. I should have come back after that. But being fickle is always a problem of mine, so I went off to do something else. It wasn't until today that I finally decided to come back completely.)

I am 53 years old this year. It has been over 40 years since I wrote my very first BASIC program on an Apple II compatible machine in the 4th grade.

Over these four decades, I’ve worked in software development, telecommunications, and testing equipment, working my way up from a grassroots coder to management. In 2010, I caught the wave of mobile game startups. Although my team once built a game that reached #1 on the global charts, the venture ultimately ended in regret.

*Super Mario Bros.* is a game I grew up with. Back then, in a relatively closed-off China, we kids called it "Super Mary." We would play and wonder: why is this bearded uncle named "Mary"? It wasn't until many years later that we learned his real name was Mario.

When I first saw *Super Mario Maker*, I was amazed by the infinite creative possibilities it gave players, and I gradually formed the idea of making a similar game myself. But over the past dozen years, despite starting development a few times, I was forced to put it down again and again, overwhelmed by the sheer volume of work for a solo developer.

**Until AI came along.**

Starting last year, I began using AI more and more to assist with my programming—from debugging to setting up entire application frameworks. In fact, in a completely new domain I recently entered, I haven't written a single line of code myself in months.

Last weekend, a sudden thought struck me: Could I have AI help me recreate the original *Super Mario Bros.*? Since I still have my main job, I can only spare a few hours in my free time each day. I figured it would take a week or two, and I was even prepared to hit an insurmountable roadblock that would prove "AI isn't quite there yet."

To my surprise, just a few hours later, the first level was up and running on my computer.

By the next day, when World 1 was completely finished, my original plan of "finishing the whole game" changed. I realized that two-thirds of my time was actually spent preparing art assets and assembling the levels. The coding part was so incredibly smooth that it completely erased my last bit of doubt about AI's capability to deliver.

> **"If that's the case, could I let AI help me build a game like Super Mario Maker?"**

I decided to give it a try. This is not just a technical experiment for a veteran coder, but a chance to fulfill a small, lingering dream.

From today on, I plan to document every step of this project's development—whether it's a breakthrough, a deep pit I fall into, or the technical challenges and my solutions—and share them with everyone.

Naturally, my "ambitions" have expanded—I now aim to build a product that offers even more depth and content than *Super Mario Maker*.

- **Content Depth:** Striving to implement over 90% of classic items, while incorporating innovative mechanics from other successful titles.
- **Total Customization:** Fully swappable art assets, allowing the game to be rebranded into something entirely unique from its foundation.
- **Expanded Mechanics:** Moving beyond just "D-pad + Jump." I'm adding advanced movements like parkour, dashing, flying, and double jumping—all with tunable parameters like speed and jump height.
- **Community Ecosystem:** A platform for players to share levels, rate content, leave comments, and interact.

I’m not sure how long this journey will take... but I'm grateful to have AI as my co-pilot.

Let's see what kind of miracles AI can bring us in this era.

**Update on the Name:**
The AI suggested a name for this game that I think fits perfectly. Since this represents the starting point of this whole endeavor, it shall be called **LevelCraft: Origin**.

---

In this "Zero Hand-Written Code" challenge, my role is more like a Product Manager and Architect. I have built a unique "AI-Collaborative Workflow" that makes development incredibly smooth.

### 1. My AI Right-Hand Men: Claude & ChatGPT

My primary dev environment is **VS Code** integrated with **Claude CLI**. The entire programming process happens in the terminal window — I drive the code output simply by "talking" with Claude.

**ChatGPT** serves as my "Senior Technical Consultant," answering general queries and troubleshooting. For complex architectural decisions, I let them "battle it out": one AI proposes a solution, the other critiques it, and they debate until they reach a consensus. The resulting solutions are usually very robust.

> **A Note on Tools:**
> I've heard rumors about newer, more powerful coding models from OpenAI. However, I've been using Claude since last year and it works perfectly for me, so I haven't switched. Perhaps this is a sign of "getting older": when I was young, I had to try every new tool immediately; now, if the tools I have are efficient and get the job done, I'd rather stay focused on the product itself.

### 2. Choosing the Engine: Godot (As Recommended by AI)

Since Web games offer the lowest barrier to entry for players, while standalone PC/Mac versions provide better performance for the future, the AI recommended **Godot**.

To be honest, I used Unity back in my mobile gaming days and had never touched Godot before. But in this new era, it doesn't really matter — I haven't had to write a single line of code myself, and the project is already running smoothly.

During the development of Ricochet — since it was primarily a web application — Claude recommended that I switch to Phaser. However, for the development of Origin, it recommended Godot instead. As the project has grown in scope and its asset base has expanded — particularly given that it may no longer be web-centric — Godot proves to be the superior choice. Consequently, I have switched back.

### 3. Assets & Audio: Data-Driven & "Stitched Art"

Current art assets are generated by **ChatGPT** and refined in **Photoshop**. My personal drawing skills are essentially zero; I rely on "old-school" tricks like masking, scaling, and stitching. For audio, I'm currently using free resources found online.

As a veteran coder, I have one architectural obsession: **I want all art assets to be fully decoupled and driven by JSON.** In the future, I even plan to build a "skinning" tool that allows artists to replace graphics and repackage the game without touching any code. For now, please bear with my "developer art."

---

🌐 Live Platform: <https://levelcraft.gg>
📂 GitHub Repo: <https://github.com/Autinhorse/levelcraft>
📺 Discord Server: <https://discord.gg/prAuYMsBvc>
