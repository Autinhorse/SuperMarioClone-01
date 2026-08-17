# LevelCraft.gg 主站改造计划

**Date:** 2026-08-03
**Status:** 进行中（三栏主页 / Arcade More 页 / 宿主导航已在工作区）

> 作者原始记录，逐字保留。原先写在游戏仓库的 `docs/bigChange.md`，内容是网站侧的活，
> 2026-08-17 挪到这里。

让 LevelCraft.gg 成为 origin 的主站，让 Ricochet 不可见。可以把当前有关 Ricochet 的内容转移到 LevelCraft.gg/ricochet 下，可以通过链接进入，但是主页不保留入口。

levelCraft.gg 的主页保留头部信息栏和上面两个宣传图以外，下面水平 3 个栏目，分别对应 Arcade，My Levels，World Levels。Arcade 现在可以显示玩过的最后一关和前（如果有）后（如果有）一关的截图以及直接玩的 Play 按钮。还有一个 More，点击进入网页（注意是网页，最好设计得和 WebApp 页面一样，但是网页实现），内容和 App 的 Arcade 点进去一样，显示关卡的列表，可以选择某一关玩。 这里的 Play 按下，进入 Godot 生成的 WebApp，但是不应该到有 3 个大 Button 的首页，而且要有办法把选择的关卡编号送给 WebApp，直接开始进去这个关卡玩。另外如果已经登录，用户的信息（ID？）也应该送给 APP，用于完成游戏记录结果（送服务器？）

同样，My Levels 下面缺省显示 Published 的 3 个关卡，点击进入关卡信息页面，然后这里可以 Play 或 Edit。同样应该能够通知 WebAPP 直接进入这个关卡的 Play 或者 Edit 模式，不经过前面的那些内容。同样 My Levels 有 More 按钮，进入的网页和 WebApp 的 My Levels 页面一样。前面讨论过，从 Web 进入 App，App 知道自己运行在网页，编辑的关卡内容 Temp 存本地，Save 到服务器。

同样，World Levels 显示当前的 6 个服务器 Levels。还有 More 按钮，页面进入后，和 WebApp 的 World Levels 页面一样（这个还没做，可以放后面实现）
