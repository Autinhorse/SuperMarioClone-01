<p align="center">
  <img src="https://img.shields.io/badge/AI-Powered-blueviolet?style=for-the-badge&logo=openai" />
  <img src="https://img.shields.io/badge/Status-Prototype-orange?style=for-the-badge" />
</p>

<h2 align="center">用与 AI 对话的方式做一款《超级马里奥制造》式的游戏</h2>
<h3 align="center">--- 全程零行手写代码 ---</h3>

<p align="center">
  <a href="./README_zh.md"><b>🇨🇳 中文说明</b></a> | 
  <a href="./README.md"><b>🇬🇧 English</b></a>
</p>

---

### 📖 缘起：在 AI 时代圆一个旧梦

我今年 53 岁。距离我小学四年级在 Apple II 兼容机上敲下人生第一段 BASIC 程序，已经过去了 40 多年。

这 40 多年里，我做过软件开发、电信、测试设备，从一个最底层的码农一路做到管理岗位。2010 年赶上手游创业的浪潮，团队曾做出过登顶全球榜首的作品，但那次创业最后还是以遗憾收场。

《超级马里奥兄弟》是陪我长大的一款游戏。那时的中国还相对封闭，我们这帮小孩儿都管它叫"超级玛丽"，一边玩一边纳闷：这位留着大胡子的叔叔为啥叫"玛丽"？很多年后才知道，他真名叫 Mario。

第一次见到《超级马里奥制造》时，我被它带给玩家的无限创造空间惊艳到了，于是慢慢萌生了自己也做一款类似游戏的念头。但十几年来，几次开始、几次又被迫放下——对一个独立开发者来说，那个工作量实在太可怕了。

**直到 AI 的出现。**

从去年开始，我越来越多地把 AI 带进我的开发流程，从调试到搭建整套应用框架。事实上，在我最近进入的一个全新领域里，已经几个月没有自己亲手写过一行代码了。

上周末突然冒出来一个念头：能不能让 AI 帮我把当年那个最初版本的《超级马里奥兄弟》先做出来？因为我还有主业，每天只能挤出几个小时业余时间。我估摸着可能要花一两周，甚至已经做好了"撞上一道过不去的坎，证明 AI 还差点意思"的心理准备。

没想到几个小时之后，第一关就已经在我电脑上跑起来了。

第二天，整个 World 1 完工的时候，我"先把整款游戏做完"的原计划已经动摇了。我意识到，我三分之二的时间其实都花在了准备美术素材和拼关卡上，写代码的部分顺利到完全打消了我对 AI 能不能交付的最后一丝怀疑。

> **"如果是这样，那我能不能让 AI 帮我做一款《超级马里奥制造》那样的游戏？"**

我决定试一试。这不只是一个老码农的技术实验，也是给自己埋了很久的一个小小心愿一个机会。

从今天起，我打算把这个项目开发过程中的每一步都记录下来——不管是阶段性突破、踩进的大坑，还是遇到的技术难题和我的解法——都分享给大家。

让我们一起看看，AI 在这个时代能给我们带来什么样的奇迹。

---

### 📖 LevelCraft 的转向
4 月 28 日

昨天我把计划发到了 Reddit 和 Godot 论坛上，反馈并不算正面，主流的态度大致是："不看好，但祝你好运。"

有位热心的网友还甩给我一篇就在几天前刚出炉的复盘文章——一次想用"vibe-code"方式做银河战士恶魔城类游戏的失败经历。https://forum.godotengine.org/t/post-mortem-of-my-failed-attempt-to-vibe-code-a-metroidvania-game/137567/19

今天，我刚把美术素材调好，正打算一头扎进"制造"机制的搭建时，犹豫了。

如果说 40 年的经验让我看清了自己的最大缺点，那就是：我变主意变得很快。我决定转向，先找一款规模更小的游戏来探探路。我打算认真投入 2-3 周的时间，应该足够看清楚这套工作流到底能不能跑得通。

说干就干。我翻出一款很老的游戏作为参考，立刻动手。

新项目叫 **Ricochet**，同样是带明显关卡感的动作游戏。计划完全依靠 Claude Code AI 来辅助编码。最终目标是交付：游戏本体、内置的关卡编辑器、以及一个能让玩家创建、游玩、分享关卡的完整网站。目标周期：4 周完成（给自己留点余量）。

如果这次没失败，我会再慢慢把"超级马里奥制造"那个想法捡回来。LevelCraft 到时候可以演化为支撑两款游戏关卡编辑器的后端基建。当然，我自己的主项目仍然是真正的优先级——那个不会动。但接下来这几周，我会全力扑在 Ricochet 上。

祝我好运。

---

### 📅 Ricochet 开发日志
* [**000:** 我的"AI 研发团队"与技术栈](./games/ricochet/devlogs/zh/000.%20我的“AI%20研发团队”与技术栈.md)
* [**001:** Day 1 - Ricochet 开始 3 个小时](./games/ricochet/devlogs/zh/001.Day%201%20-%20Ricochet%20开始3个小时.md)
* [**002:** Day 2 - 今天的进展不错](./games/ricochet/devlogs/zh/002.Day%202%20-%20今天的进展不错.md)
* [**003:** Day 3 - 编辑器优化和更多的地图元素](./games/ricochet/devlogs/zh/003.Day%203%20-%20编辑器优化和更多的地图元素.md)
* [**004:** Day 4 and 5 - 翻天覆地的变化，游戏部分基本完成](./games/ricochet/devlogs/zh/004.Day%204%20and%205%20-%20翻天覆地的变化,游戏部分基本完成.md)
* [**005:** Day 6 - 几个小时，网站上线](./games/ricochet/devlogs/zh/005.Day%206%20-%20几个小时，网站上线.md)
* [**006:** Day 7 and 8 - 更新美术素材](./games/ricochet/devlogs/zh/006.Day%207%20and%208%20-%20更新美术素材.md)

*（更多更新即将推出……）*

---
YouTube 频道：
[![Watch the Ricochet Series](https://img.youtube.com/vi/OV4my9E5MFs/maxresdefault.jpg)](https://www.youtube.com/playlist?list=PLGRcYbz8uCmBZSH-Ob8TIuEb3_6B3GdZv)


---

### 📅 Super Jumper Maker 开发日志

* [**000:** 我的"AI 研发团队"与技术栈](./games/_archive_jump/devlogs/zh/000.%20%E6%88%91%E7%9A%84%E2%80%9CAI%20%E7%A0%94%E5%8F%91%E5%9B%A2%E9%98%9F%E2%80%9D%E4%B8%8E%E6%8A%80%E6%9C%AF%E6%A0%88.md)
* [**001:** Week 1 - LevelCraft 的诞生](./games/_archive_jump/devlogs/zh/001.Week%201%20-%20LevelCraft%20%E7%9A%84%E8%AF%9E%E7%94%9F.md)
* [**002:** Day 10 - 网友的冷水](./games/_archive_jump/devlogs/zh/002.Day%2010%20-%20%E7%BD%91%E5%8F%8B%E7%9A%84%E5%86%B7%E6%B0%B4.md)


*（更多更新稍后放出……）*

---
© 2026 AI Dream Builder. Built with 🤖 and ❤️.
