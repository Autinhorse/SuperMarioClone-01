### 📖 The Pivot of LevelCraft
April 28

Yesterday, I posted my plan on Reddit and the Godot forums, and the reception wasn't exactly positive. The general consensus was basically: "Not optimistic, but good luck."

One helpful user even pointed me toward a post-mortem of a failed attempt to 'vibe-code' a Metroidvania game just a few days ago. https://forum.godotengine.org/t/post-mortem-of-my-failed-attempt-to-vibe-code-a-metroidvania-game/137567/19

Today, just as I finished adjusting the art assets and was about to dive into building the "Maker" mechanics, I found myself hesitating.

If 40 years of experience has taught me anything about my biggest flaw, it's that I change my mind very quickly. I've decided to pivot and find a smaller-scale game to test the waters first. I'll invest 2-3 weeks of serious effort into it; that should be enough time to see if this workflow actually yields results or not.

No sooner said than done. I dug up a very old game to use as a reference and got straight to work.

The new project is called Ricochet, which is also an action-based game with distinct levels. The plan is to rely completely on Claude Code AI for coding assistance. The ultimate goal is to deliver the game itself, an integrated level editor, and a fully functional website where users can create, play, and share their levels. The target: get it done in 4 weeks (giving myself a bit of a buffer).

If this doesn't fail, I'll slowly pick up the Super Mario Maker idea again. LevelCraft can then evolve into the backend infrastructure supporting the level editors for both games. Of course, I still have my primary, ongoing project—that remains the real priority. But for the next few weeks, I'm going all-in on Ricochet.

Wish me luck.

---

🌐 Live Platform: https://levelcraft.gg
📂 GitHub Repo: https://github.com/Autinhorse/levelcraft
📺 Discord Server: https://discord.gg/prAuYMsBvc

---
### Summary of Results:###  11 days—and the website is live now. It includes the site itself, the game, and a level editor—all built with zero lines of handwritten code. You can check out the results for yourselves at Levelcraft.gg.

### The "Zero-Code" Reality
The entire project was built in VS Code using Claude Code for architecture and logic, and Codex for sprite generation. The site runs on Vercel and Supabase.

I started with Godot, but following Claude’s advice, I migrated to Phaser. Despite having Unity experience, my knowledge of both these engines was—and still is—zero. I haven’t handwritten a single line of code. Claude architected the system, suggested a 13-step migration plan when we switched engines, and guided me through every integration.

### Development Process

For the programming side, I genuinely believe that a reasonably experienced developer’s workload — something that might traditionally take 3–6 months — can now often be completed in just a few weeks with AI guidance, as long as the technology involved is not extremely specialized.

What’s even more interesting is how AI changes the entire development workflow itself.

Traditionally, an industry expert would first explain requirements to a developer.
The developer would then implement the feature, hand it back, receive feedback, try to understand the issues, revise it again, test again… and repeat this cycle endlessly.

But if the domain expert can directly communicate with AI, instantly see results, and iteratively refine them through conversation, the efficiency increase is enormous.

At that point, many traditional programming roles begin to disappear.
(Old-school programmers like me may need a moment to recover from that realization.)

That said, experience still matters.

Some issues are difficult to diagnose if you’ve never built similar games before.

For example, in my platformer, when the player jumped upward while sliding against a wall, they would sometimes get blocked by what visually appeared to be a perfectly vertical surface — and sometimes they wouldn’t.

Based on experience, I immediately suspected the problem:
both the player and the walls were using square collision boxes, and tiny floating-point inaccuracies were causing inconsistent collision detection.

So instead of trying to “fix the bug” directly, I instructed the AI to slightly separate the player from walls during rebounds, and also keep horizontal movement slightly above the ground. That completely avoided the issue.

Another example: sometimes the player could not fall through a one-tile-wide gap in the floor.

Again, the cause was obvious to me from past experience:
the square collision box was too wide.

I told the AI to shrink the player’s collision box horizontally by a few pixels, and the problem disappeared instantly.

These are all lessons learned from years of developing similar games.

Because I’m also working on several other major projects, these 11 days were not spent full-time on this game. Realistically, I probably dedicated around half my time to it.

Of course, “programmer half-time” is not exactly a normal 8-hour workday.

A surprisingly large amount of time was actually spent generating art assets.

Even using what is supposedly one of the most advanced coding agents available today — Codex — image generation still required significant manual Photoshop work:

cropping
alignment
cleanup
consistency adjustments

AI-generated art also tends to drift away from the intended visual style over time.

Quite often I had to tell it:

“Use this image as a style reference.”

Only then could it pull the visuals back into the correct direction.

Scene generation and environmental elements worked surprisingly well.

But animated assets involving multiple perspectives were much more problematic.

For example, I originally asked the AI to generate an 8-frame spinning energy bottle animation rotating around a vertical axis.

Out of the 8 frames, there would always be one or two incorrect angles.
I spent over an hour trying to fix it through prompting alone and still couldn’t get a fully consistent result.

Eventually, I gave up and replaced it with a glowing animation instead.

Another manually finished asset was the conveyor belt animation.

The conveyor belt required three seamlessly connectable pieces:

left end
middle segment
right end

The AI-generated images simply would not align correctly.

In the end, I kept the outer frame generated by AI and manually drew the moving arrows myself.

(The result honestly looks terrible. Please forgive my amateur-level art skills.)

Maybe part of the problem is that I’m not a professional artist and haven’t deeply studied AI image workflows yet.

I genuinely hope artists will explore this area further.

Ideally, I’d love to hear:

“Art can already be fully AI-generated — programming is the harder part.”

Then maybe artists and programmers can finally switch places for once.

The entire website was also generated entirely through AI, including all visual design work.

I simply provided a reference image and told the AI:

“I want the website to look like this.
My platform is about XXXX.
It needs XXXXX features.”

And it generated the initial version.

From there, the process became iterative conversations refining individual features one by one.

Zero handwritten code.

I used the Claude Max Plan throughout this experiment.

At one point I completely exhausted my token limit — specifically during the migration from Godot to Phaser.

That process required the AI to continuously read old code and generate entirely new codebases, so the workload was extremely heavy.

For normal development intensity, though, the plan was generally sufficient.

There were also several complex modifications where the AI would run for very long periods of time.

The longest single run took around 25 minutes.
Runs close to 20 minutes happened almost daily.

Fortunately, the system continuously displayed what the AI was currently doing, so it still felt manageable.

It also gave me plenty of time to scroll on my phone.

### Important Conclusion

After this experiment, my conclusion is simple:

For games of this scale, programming can already be almost entirely replaced by AI.

Art is still weaker — or perhaps more accurately, it still has limitations that developers must work around.

But on the programming side, achieving a true “100% zero-code workflow” already feels possible.

The art assets generated by AI are currently “usable,” but still far from truly polished or production-quality.

Of course, much larger and more complex games may still encounter major technical limitations.

But games have always been driven primarily by ideas.

And now, with AI, great ideas are no longer bottlenecked by a lack of programmers or artists.

AI can rapidly transform ideas into playable reality.

### Game By Talk Only. The experiment continues.


### 📅 Ricochet Development Logs
* [**000:** My AI Dev Team and Tech Stack ](./000.My%20AI%20Dev%20Team%20and%20Tech%20Stack.md)
* [**001:** Day 1 - The First 3 Hours of Ricochet ](./001.Day%201%20-%20The%20first%20three%20hours%20of%20Ricochet.md)
* [**002:** Day 2 - Core Mechanics & Editor Foundations ](./002.Day%202%20-%20Core%20Mechanics%20&%20Editor%20Foundations.md)
* [**003:** Day 3 - Editor Optimizations and Additional Map Elements ](./003.Day%203%20-%20Editor%20Optimizations%20and%20Additional%20Map%20Elements.md)
* [**004:** Day 4 and 5 - Massive Overhaul, Core Game Mechanics Finished ](./004.Day%204%20and%205%20-%20Massive%20Overhaul,%20Core%20Game%20Mechanics%20Finished.md)
* [**005:** Day 6 - Site Live in Hours ](./005.Day%206%20-%20Site%20Live%20in%20Hours.md)
* [**006:** Day 7 and 8 - Art Asset Integration ](./006.Day%207%20and%208%20-%20Art%20Asset%20Integration.md)
* [**007:** Day 11 - Final result: THE IMPOSSIBLE ASCENSION](./007.Day%2011%20-%20Final%20result%20THE%20IMPOSSIBLE%20ASCENSION.md)



---
Youtube Channel Available here:
[![Watch the Ricochet Series](https://img.youtube.com/vi/OV4my9E5MFs/maxresdefault.jpg)](https://www.youtube.com/playlist?list=PLGRcYbz8uCmBZSH-Ob8TIuEb3_6B3GdZv)
