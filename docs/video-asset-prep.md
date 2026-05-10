# Video asset prep — build scripts for the two YouTube videos

Open this in a split pane while recording. Everything here is "build it
by clicking in the editor" — no JSON editing needed.

## Coordinate convention used below

- `(x, y)` = (column, row), **0-indexed**, origin top-left, y goes down.
- 1 tile = 48 px. Player hitbox is 1×1 tile.
- Editor viewport = 25 wide × 20 tall (1200×960). Keep everything inside
  roughly **x ≤ 22, y ≤ 16** and the clip is one clean screen, no scroll.
- New-level template (from `levelcraft.gg/ricochet/create`) is 30 wide ×
  18 tall, floor (`W`) on row 17, spawn at (1,16), exit at (28,16).
  For the demo levels below, erase the floor back to the width shown, or
  just build the floor fresh.

## Movement cheatsheet (so the layouts make sense)

- On the ground, **← / →** = rise 1 tile, then fly horizontally at
  5 tiles/sec until you hit something.
- **↑** = fly straight up until you hit something.
- Hit a wall flying sideways → rebound 1 tile, pause, then fall.
- **Space** = jump 2 tiles straight up; you can press an arrow *any time*
  during the jump arc to launch from mid-air.
- Gravity 10 t/s², terminal fall speed = 5 t/s.

## ASCII legend

```
W wall      . empty     S spawn     E exit
^ v < >  directional spike, pointing that way
B spike-block        G glass wall
C cannon (note dir)  T turret (auto-aims at player)
L laser (note dir)   @ gear center
= conveyor           K key   k key-wall (matching color)
O portal endpoint
```

> Confirmed against the editor: conveyor **`CW →`** pushes the top
> surface **right**, **`CCW ←`** pushes **left**. Element params (period,
> delay, extend/retract, etc.) are edited with **`[− value +]` stepper
> buttons** in the params panel after you select the element — no typing.
> One thing to eyeball in-editor: a `dir: up` spike should sit on a floor
> pointing up; if any spike reads backwards, just flip its dir.

---

# VIDEO 1 — eight hazard montage clips

Each is a tiny, fast, completable run that puts one hazard front-and-center.
Target ~6–10 s of usable footage per clip. Record each one 3–4 times; a
clean thread-the-needle *or* a dramatic death are both montage-worthy —
grab both.

General recipe for all eight: floor across the bottom, **S** on the left
end of the floor, **E** on the right end, the hazard in the middle gap.
Press **→** at spawn, watch the hazard do its thing, reach the exit.

---

## Clip 1 — Directional Spike

Floor with a spike pointing up in the path; you jump over it.

```
.........................
.........................
.........................
WWWWWWWWWWWWWWWWWWWWWWWWW
S......^................E   (floor row)
WWWWWWWWWWWWWWWWWWWWWWWWW
```

Build:
1. Floor `W` row, ~22 wide. Add the top `W` row 1 tile above so the
   level reads as a corridor (optional, looks nicer).
2. **Spawn** at left end of the floor (on top of it).
3. **Exit** at right end of the floor.
4. Tool **Spike**, params dir = **up**, place one at ~(7, floor-row-minus-1)
   — i.e. sitting on the floor.

The shot: at spawn press **Space** to jump, then **→** at the top of the
jump to clear the spike and land past it, then **→** again to the exit.
Alt take: just press **→** and die on the spike (montage cut: "one wrong
move").

---

## Clip 2 — Spike Block (pulsing)

A spiked block that extends and retracts; you pass when it's down.

```
.........................
............B............
.........................
WWWWWWWWWWWW.WWWWWWWWWWWWW   (gap in floor under the block? no — keep floor solid)
S.......................E
WWWWWWWWWWWWWWWWWWWWWWWWWW
```

Simpler version: put the spike block **hanging in the air** in the flight
path, mid-height, with a pulse cycle.

Build:
1. Floor `W` ~22 wide, **Spawn** left, **Exit** right.
2. Tool **SBlock**, place one at about (10, floor-row-minus-3) so it's
   floating in the launch path.
3. After placing, **select it** (click it with no tool active) and in the
   params panel use the steppers: **Extend ≈ 1.0 s** (lethal/out time),
   **Retract ≈ 1.2 s** (safe/in time), leave **Delay** at 0.

The shot: press **→** — if the block is retracted you fly under/through;
if it's out, you die. Time the launch to slip past while it's down. Two
or three takes will land a clean one. (Prefer a tamer demo? Set Extend to
0 — "always out" — drop it at chest height, and just fly *over* it via
Space → →.)

---

## Clip 3 — Glass Wall

Land on a glass floor segment; it cracks and drops you.

```
.........................
.........................
S........................
WWWWWWWWGGGGGWWWWWWWWWWWWW   (5 glass tiles set into the floor)
........               ...
........  (pit below)  ...
WWWWWWWWWWWWWWWWWWWWWWWWWWW   (lower floor, with E somewhere reachable)
E........................
```

Build:
1. Two floors: an upper one (~22 wide) with a **5-tile gap**, and a lower
   floor ~3 rows below spanning the gap.
2. Fill the upper-floor gap with tool **Glass** (5 tiles).
3. **Spawn** on the upper floor, left of the glass.
4. **Exit** on the lower floor (so the only way down is through the glass).
5. Glass default `delay` is 1.5 s — fine. (Select a glass tile to tweak
   if you want it faster.)

The shot: press **→**, land on the glass, ~1.5 s pause as it cracks, fall
through to the lower floor, **→** to the exit. The crack-then-drop is the
beat — hold the camera on it.

---

## Clip 4 — Cannon

A wall-mounted cannon firing a steady stream of bullets across the path.

```
.........................
.........................
C> . . . . . . . . . . . .   (cannon on the left, firing right)
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S.......................E
```

Wait — put the cannon **above the path firing down**, or **on a side wall
firing across**. Across is the cleaner read:

Build:
1. Floor `W` ~22 wide. Build a 2–3 tile wall column on the left, a couple
   rows above the floor.
2. Tool **Cannon**, params dir = **right**, place it on that column at
   ~2 tiles above the floor.
3. **Spawn** on the floor left-of-center, **Exit** on the floor right end.
4. Defaults: period 2.0 s, bullet speed 8 t/s — good. (Select to retune.)

The shot: stand at spawn, wait for a bullet to pass, then **→** and run
under/after it to the exit. Or jump (**Space → →**) over a bullet. The
rhythm of the bullets is the visual.

---

## Clip 5 — Turret (auto-aiming)

A turret that tracks the player and fires at them on a period.

```
.........................
.........................
..........T..............   (turret up on a pillar)
.........WWW.............
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S.......................E
```

Build:
1. Floor `W` ~22 wide. A small pillar (`W` stack) in the middle, 3–4 tiles
   tall, with the **Turret** placed on top of it (tool **Turret**, no dir
   — it aims itself).
2. **Spawn** left end of floor, **Exit** right end.
3. Defaults: period 2.0 s, bullet speed 8 t/s.

The shot: move along the floor in bursts (**→**, stop, **→**) so the
turret's shots miss behind you. The "it's tracking me" feeling sells it —
linger a beat at spawn so viewers see a shot come straight at you, then
move. Death take: walk steadily and eat a bullet.

---

## Clip 6 — Laser Cannon (sweeping)

A rotating laser beam sweeping the corridor; you dash through during a gap.

```
.........................
.........................
.....L>..................   (laser on left wall, rotate = cw)
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S.......................E
```

Build:
1. Floor `W` ~22 wide, with a 2-row-high open corridor above it (add a
   ceiling `W` row so the beam visibly bounds the space).
2. Build a short wall on the left for the laser to mount on.
3. Tool **Laser**, params: dir = **right**, rotate = **cw** (slow sweep),
   duration = **3.0**, downtime = **3.0** (so it blinks on/off — gives a
   safe window). Place it on the left wall mid-corridor.
4. **Spawn** left end, **Exit** right end.

The shot: wait at spawn until the beam is **off** (downtime), then **→**
straight to the exit before it comes back. The blink + sweep is the most
visually striking hazard — give it the longest clip (~10 s) and consider
slow-mo in the edit.

Variant for a second laser clip: rotate = **none**, duration = 1.0,
downtime = 1.0 — a strobing static beam you jump-time past.

---

## Clip 7 — Gear (moving)

A big spinning gear patrolling a stretch of corridor on a path.

```
.........................
.........................
....@......waypoints.....   (gear travels left↔right along this row)
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S.......................E
```

Build:
1. Floor `W` ~22 wide, with a tall-ish open space above (gear default
   size = 2 tiles diameter; give it room).
2. Tool **Gear**, place the gear's **center** at ~(6, floor-row-minus-3).
3. Now add waypoints: after placing, the gear goes into path-edit mode
   (click cells to add waypoints; per `editor.md` flow). Add one waypoint
   far to the right, ~(18, same row), and **don't close the loop** (or do
   — `closed` just makes it cycle vs ping-pong; ping-pong reads fine).
   Finish path edit.
4. Defaults: speed 3 t/s, spin 4 rad/s.
5. **Spawn** left end, **Exit** right end.

The shot: the gear sweeps toward you; press **→** to fly under/past it
when it's at the far end of its run, beat it to the exit. The patrol
motion + the rotating teeth is the eye-catch.

---

## Clip 8 — Conveyor (+ spike combo)

A belt that carries you — toward a spike if you don't act, away if you do.

```
.........................
.........................
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S....========^...........E   (belt segment, then an up-spike)
WWWWWWWWWWWWWWWWWWWWWWWWWWW
```

Build:
1. Floor `W` ~22 wide. **Spawn** at left, **Exit** at right.
2. Tool **Conveyor**, dir = **cw** (pushes right — verify!). Lay ~6 belt
   tiles starting a couple tiles right of spawn.
3. Tool **Spike**, dir = **up**, place one **at the right end of the belt**
   so the belt is carrying you toward it.
4. (Optional drama) put a second short belt segment after the spike, dir =
   **ccw** (pushes left, back toward the spike) — then the player must
   launch **→** with authority to escape it.

The shot: land on the belt, get carried toward the spike, press **→** at
the last moment to launch over it and reach the exit. The "the floor is
moving me toward death" beat is great. Death take: do nothing, ride into
the spike.

---

## Bonus mechanic clips (optional, if you want to show non-lethal toys)

- **Key + K-Wall**: floor, **K** (Key) on a ledge you must jump to,
  then a **k** (K-Wall, same color) blocking the path to **E**. Grab key
  → wall vanishes → exit. ~8 s.
- **Portal**: two **O** endpoints (same color) at opposite ends of the
  screen; fly into one, pop out the other right by the **E**. ~5 s.
- **Teleport (Tele)**: needs 2 pages. Page 0: floor, **S**, a **Tele**
  tile (target = page 1). Page 1: floor, **E** right there. Fly into the
  Tele → fade → land on page 1 → exit. Shows the multi-page feature the
  video script mentions. ~6 s.

---

# VIDEO 2 — quick-start demo level (build-on-camera script)

This is the level you build *live* in the editor-quick-start video. The
point is to show the workflow, not a hard level — keep it dead simple.
Run through these steps once off-camera first so the on-camera take is
smooth.

Target finished level (one screen, ~15 s to play):

```
.........................
.........................
.....C>..................   ← cannon firing right
.........................
WWWWWWWW.....WWWWWWWWWWWWWW   ← floor with a 5-tile pit
S.......     ^      .....E   ← spike at the bottom of the pit area
........WWWWW WWWWW........   ← lower ledge bridging the pit, with one up-spike on it
```

(If that's too much, drop the cannon — walls + pit + spike + spawn + exit
is enough to demo the loop.)

### On-camera sequence

1. **Sign in** at levelcraft.gg → click **Build** (the create button).
   You land in the embedded editor on the 30×18 template (floor + spawn +
   exit already there).
2. **Walls** — pick the **Wall** tool. Point out drag-to-paint: hold and
   drag to lay a row. Carve a **5-tile pit** in the floor (erase 5 floor
   tiles with **Erase**), then paint a **lower ledge** 2 rows below the
   pit so there's a floor to land on.
3. **Spawn / Exit** — they already exist from the template. Pick the
   **Spawn** tool, click to move it to the left end of the top floor.
   Pick **Exit**, click to move it to the right end of the top floor.
   Mention: 1 spawn per page, 1 exit per level.
4. **A hazard** — pick **Spike**, set dir = **up** in the params panel,
   click once on the lower ledge so there's a spike to dodge when you drop
   in. (Optional: add the **Cannon** above the path, dir = right, to show
   a second hazard type and the params panel.)
5. **Test play** — hit **▶ Play**. Play it: at spawn press **→**, fall
   into the pit, land on the ledge dodging the spike, **→** to the far
   wall, rebound, climb back up (**↑** off the ledge or jump), **→** to
   the exit. Show a death too, then **▶ Play** again — point out it
   restarts instantly.
6. **Save** — back in edit mode, hit **Save**. (Mention auto-sizing: the
   page trims to your furthest element on save.)
7. **Title** — go to the publish flow on the website. Give it a title +
   short description.
8. **Publish flow** — show the **playtest gate**: it makes you clear the
   level once before it'll publish. Click publish → it drops you into a
   silent test → clear it → "Test passed ✓ Publish?" → confirm. Show the
   **PNG thumbnail** that gets generated.
9. **Post-publish** — land on the level's play page; show it now appears
   on your **profile** and in **/explore**, with its thumbnail and a
   shareable URL. Mention the **revision swap**: editing a published level
   forks a draft, and re-publishing swaps it back into the live version.

End card: levelcraft.gg + Discord link.

---

# GLAMOUR / B-ROLL SHOT LIST (both videos)

- **Complete-level runs**: pick 2–3 of the 10 seed levels (`level-01` …
  `level-10`) that look busiest on screen — record clean full clears.
  These are your "look how rich levels can get" cutaways.
- **Editor sequence**: 10–15 s of laying walls with drag-paint, dropping
  a few hazards, opening a params panel. (Step 2–4 above doubles as this.)
- **levelcraft.gg landing shot**: scroll the homepage slowly — Hero video
  playing, StatsStrip, Featured/Latest level cards with their PNG
  thumbnails. End-card material.
- **/explore grid**: the wall of level thumbnails, slow scroll.
- **Multi-page**: a level with a Teleport, caught mid fade-to-black
  transition between pages — supports the "levels can be huge" line.
- **Profile page** (`/u/Autinhorse`): your published levels with play /
  like / rating counts visible — proof the platform is real and live.

# RECORDING CHECKLIST (from the handoff)

- 1080p60 OBS, browser-only window, no system-audio leak.
- Mic test — USB or lavalier, not the laptop mic.
- Pre-stage the demo level so the editor opens clean.
- Re-record raw clips multiple times; edit later. Voice-over last.

---
---

# 中文版 — 两个 YouTube 视频的素材搭建脚本

录制时开个分屏对着这个看。这里所有东西都是「在编辑器里点鼠标就能搭」——不用改 JSON。

## 下文用到的坐标约定

- `(x, y)` = (列, 行)，**从 0 开始**，原点在左上角，y 向下增长。
- 1 格 = 48 像素。玩家碰撞箱是 1×1 格。
- 编辑器视窗 = 宽 25 × 高 20（1200×960）。把所有东西控制在大约 **x ≤ 22, y ≤ 16** 以内，画面就是干净的一屏，不会滚动。
- 新关卡模板（从 `levelcraft.gg/ricochet/create` 创建）是宽 30 × 高 18，地板（`W`）在第 17 行，spawn 在 (1,16)，出口在 (28,16)。下面的演示关卡，把地板擦回示意图里的宽度，或者干脆重新画一条地板。

## 移动速查（这样布局才看得懂）

- 在地面上，**← / →** = 先升 1 格，然后以 5 格/秒水平飞行，撞到东西才停。
- **↑** = 直直往上飞，撞到东西才停。
- 水平飞行撞墙 → 反弹 1 格，短暂停顿，然后下落。
- **空格** = 原地向上跳 2 格；跳跃弧线的*任意时刻*都能按方向键，从半空中朝那个方向发射。
- 重力 10 格/秒²，下落终端速度 = 5 格/秒。

## ASCII 图例

```
W 墙        . 空        S 出生点    E 出口
^ v < >  定向尖刺，朝那个方向
B 尖刺方块            G 玻璃墙
C 加农炮（注明方向）  T 炮塔（自动瞄准玩家）
L 激光（注明方向）    @ 齿轮中心
= 传送带             K 钥匙   k 钥匙墙（同色）
O 传送门端点
```

> 已对着编辑器核对：传送带 **`CW →`** 让上表面把你推向**右**，**`CCW ←`** 推向**左**。元素参数（周期、延迟、伸出/缩回等）是选中元素后在参数面板里用 **`[− 数值 +]` 步进按钮**调的——不用打字。有一处需要在编辑器里目测确认：`dir: up` 的尖刺应该立在地板上朝上指；如果有哪个尖刺方向看着反了，把它的 dir 翻一下就行。

---

# 视频 1 —— 八个 hazard 蒙太奇片段

每个都是一小段、节奏快、可通关的跑酷，把某一个 hazard 摆在最显眼的位置。每个片段目标 ~6–10 秒可用素材。每个录 3–4 遍；干净的「穿针引线」过关 *或者* 戏剧性的死亡都值得放进蒙太奇——两种都拍。

八个的通用配方：底部一条地板，**S** 在地板左端，**E** 在右端，hazard 摆在中间的空当里。出生点按 **→**，看 hazard 表演，到达出口。

---

## 片段 1 —— 定向尖刺

地板上路径中间一根朝上的尖刺，你跳过去。

```
.........................
.........................
.........................
WWWWWWWWWWWWWWWWWWWWWWWWW
S......^................E   (地板那一行)
WWWWWWWWWWWWWWWWWWWWWWWWW
```

搭建：
1. 一行地板 `W`，约 22 宽。上方 1 格再加一行 `W`，让关卡读起来像走廊（可选，更好看）。
2. **Spawn** 放在地板左端（站在地板上）。
3. **Exit** 放在地板右端。
4. 工具 **Spike**，参数 dir = **up**，在大约 (7, 地板行-1) 放一个——也就是立在地板上。

镜头：在出生点按**空格**起跳，跳到最高点时按 **→** 越过尖刺落到它后面，再按 **→** 到出口。备用 take：直接按 **→** 撞死在尖刺上（蒙太奇剪辑：「一步走错」）。

---

## 片段 2 —— 尖刺方块（脉冲式）

会伸出又缩回的尖刺方块；它缩回时你才过得去。

```
.........................
............B............
.........................
WWWWWWWWWWWW.WWWWWWWWWWWWW   (方块下面的地板要不要留缺口？不——地板保持完整)
S.......................E
WWWWWWWWWWWWWWWWWWWWWWWWWW
```

更简单的版本：把尖刺方块**悬在空中**摆在飞行路径上，中等高度，带一个脉冲周期。

搭建：
1. 地板 `W` 约 22 宽，**Spawn** 左、**Exit** 右。
2. 工具 **SBlock**，在大约 (10, 地板行-3) 放一个，让它飘在发射路径里。
3. 放好后**选中它**（不选工具时点它），在参数面板用步进器：**Extend ≈ 1.0 s**（伸出/致命的时长）、**Retract ≈ 1.2 s**（缩回/安全的时长），**Delay** 保持 0。

镜头：按 **→** —— 方块缩回时你从下面/中间飞过去；伸出时你死。掐准发射时机趁它缩回时溜过去。两三遍就能录到一条干净的。（想要更温和的演示？把 Extend 设成 0 ——「永远伸出」——放在齐胸高度，靠 空格 → → 直接从它*上方*飞过。）

---

## 片段 3 —— 玻璃墙

落在一段玻璃地板上，它裂开把你摔下去。

```
.........................
.........................
S........................
WWWWWWWWGGGGGWWWWWWWWWWWWW   (5 块玻璃嵌进地板里)
........               ...
........  (下方是坑)    ...
WWWWWWWWWWWWWWWWWWWWWWWWWWW   (下层地板，E 放在能到达的地方)
E........................
```

搭建：
1. 两条地板：上面那条（约 22 宽）中间留一个 **5 格的缺口**，下面那条在缺口下方约 3 行处、把缺口跨过去。
2. 用工具 **Glass** 把上层地板的缺口填满（5 块）。
3. **Spawn** 放上层地板、玻璃的左边。
4. **Exit** 放下层地板（这样唯一下去的路就是穿过玻璃）。
5. 玻璃默认 `delay` 是 1.5 秒——可以。（想更快就选中某块玻璃调。）

镜头：按 **→**，落在玻璃上，~1.5 秒玻璃裂开的停顿，掉到下层地板，**→** 到出口。「裂开然后掉下去」是关键的一拍——镜头停在那上面。

---

## 片段 4 —— 加农炮

墙上装一门加农炮，往路径上稳定地喷一串子弹。

```
.........................
.........................
C> . . . . . . . . . . . .   (加农炮在左边，朝右开火)
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S.......................E
```

等一下——把加农炮放在**路径上方朝下打**，或者**装在侧墙上横着打**。横着打读起来更清楚：

搭建：
1. 地板 `W` 约 22 宽。在左边、地板上方几行处搭一根 2–3 格高的墙柱。
2. 工具 **Cannon**，参数 dir = **right**，放在那根柱子上、地板上方约 2 格处。
3. **Spawn** 放在地板偏左，**Exit** 放在地板右端。
4. 默认值：周期 2.0 秒，子弹速度 8 格/秒——很好。（想调就选中它。）

镜头：站在出生点，等一发子弹过去，然后 **→** 跟在它后面/从它下面跑到出口。或者跳（**空格 → →**）越过一发子弹。子弹的节奏感是画面看点。

---

## 片段 5 —— 炮塔（自动瞄准）

会追踪玩家、按周期朝玩家开火的炮塔。

```
.........................
.........................
..........T..............   (炮塔在一根柱子顶上)
.........WWW.............
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S.......................E
```

搭建：
1. 地板 `W` 约 22 宽。中间一根小柱子（`W` 叠起来），3–4 格高，**Turret** 放在柱子顶上（工具 **Turret**，没有方向参数——它自己瞄）。
2. **Spawn** 地板左端，**Exit** 右端。
3. 默认值：周期 2.0 秒，子弹速度 8 格/秒。

镜头：沿地板一段一段地走（**→**，停，**→**），让炮塔的子弹打在你身后扑空。「它在追着我打」的感觉是卖点——在出生点停一拍，让观众看到一发子弹直冲你来，然后再动。死亡 take：匀速走，吃一发子弹。

---

## 片段 6 —— 激光炮（扫射）

旋转的激光束扫着走廊；你趁间隙冲过去。

```
.........................
.........................
.....L>..................   (激光在左墙上，rotate = cw)
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S.......................E
```

搭建：
1. 地板 `W` 约 22 宽，上方留一条 2 行高的空走廊（再加一行天花板 `W`，让光束有可见的边界）。
2. 左边搭一小段墙给激光当底座。
3. 工具 **Laser**，参数：dir = **right**，rotate = **cw**（慢扫），duration = **3.0**，downtime = **3.0**（这样它会开/关闪烁——给出一个安全窗口）。装在左墙、走廊中间高度。
4. **Spawn** 左端，**Exit** 右端。

镜头：在出生点等到光束**关**的时候（downtime），然后 **→** 直冲出口、赶在它回来之前。闪烁 + 扫射是视觉冲击力最强的 hazard——给它最长的片段（~10 秒），剪辑时考虑慢动作。

第二条激光片段的变体：rotate = **none**，duration = 1.0，downtime = 1.0 —— 一道频闪的静止光束，靠掐跳跃时机过去。

---

## 片段 7 —— 齿轮（移动）

一个大转齿轮，沿一条路径在一段走廊里来回巡逻。

```
.........................
.........................
....@......waypoints.....   (齿轮沿这一行左右移动)
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S.......................E
```

搭建：
1. 地板 `W` 约 22 宽，上方留出比较高的空间（齿轮默认 size = 直径 2 格；给它留地方）。
2. 工具 **Gear**，把齿轮的**中心**放在大约 (6, 地板行-3)。
3. 然后加航点：放好后齿轮进入路径编辑模式（点格子加航点；按 `editor.md` 的流程）。在右边远处加一个航点，大约 (18, 同一行)，**不要闭合回路**（闭不闭合都行——`closed` 只是让它循环跑 vs 来回弹；来回弹读起来挺好）。结束路径编辑。
4. 默认值：speed 3 格/秒，spin 4 弧度/秒。
5. **Spawn** 左端，**Exit** 右端。

镜头：齿轮朝你扫过来；趁它跑到这段路的远端时按 **→** 从它下面/旁边飞过，抢在它前头到出口。巡逻的运动 + 旋转的齿是抓眼球的点。

---

## 片段 8 —— 传送带（+ 尖刺组合）

一条带子载着你走——你不动它就把你送向尖刺，你动它就帮你逃开。

```
.........................
.........................
.........................
WWWWWWWWWWWWWWWWWWWWWWWWWWW
S....========^...........E   (一段传送带，然后一根朝上的尖刺)
WWWWWWWWWWWWWWWWWWWWWWWWWWW
```

搭建：
1. 地板 `W` 约 22 宽。**Spawn** 左、**Exit** 右。
2. 工具 **Conveyor**，dir = **cw**（推右）。从出生点右边几格开始铺约 6 块带子。
3. 工具 **Spike**，dir = **up**，在**传送带的右端**放一根，让带子正把你送向它。
4. （可选的戏剧性）在尖刺后面再放一小段传送带，dir = **ccw**（推左，往尖刺方向送回去）—— 这样玩家必须果断地 **→** 发射才能逃开。

镜头：落到带子上，被载着送向尖刺，最后一刻按 **→** 飞过尖刺到出口。「地板正把我推向死亡」这一拍很棒。死亡 take：什么都不做，被送进尖刺。

---

## 附加机关片段（可选，想展示一下非致命的小玩意儿就拍）

- **Key + K-Wall**：地板，**K**（钥匙）放在一个要跳上去才够得到的台子上，然后一道 **k**（钥匙墙，同色）挡住去 **E** 的路。拿到钥匙 → 墙消失 → 出口。~8 秒。
- **Portal**（传送门）：屏幕两端各放一个 **O** 端点（同色）；飞进一个，从另一个 **E** 旁边冒出来。~5 秒。
- **Teleport（Tele，跨页传送）**：需要 2 页。第 0 页：地板、**S**、一个 **Tele** 格子（target = 第 1 页）。第 1 页：地板、**E** 就在那儿。飞进 Tele → 淡出 → 落到第 1 页 → 出口。展示视频脚本里提到的多页特性。~6 秒。

---

# 视频 2 —— 快速入门 demo 关卡（边录边搭的脚本）

这是你在「编辑器快速入门」视频里*现场*搭的关卡。重点是展示流程，不是做一个难关——做得越简单越好。先关掉摄像机走一遍这些步骤，正式录的时候才顺。

目标成品关卡（一屏，~15 秒能玩完）：

```
.........................
.........................
.....C>..................   ← 加农炮朝右开火
.........................
WWWWWWWW.....WWWWWWWWWWWWWW   ← 地板，中间一个 5 格的坑
S.......     ^      .....E   ← 坑底区域有一根朝上的尖刺
........WWWWW WWWWW........   ← 跨过坑的下层台子，上面有一根朝上的尖刺
```

（觉得太多就去掉加农炮——墙 + 坑 + 尖刺 + spawn + exit 已经够演示整个循环了。）

### 镜头前的顺序

1. **登录** levelcraft.gg → 点 **Build**（创建按钮）。你会进到内嵌编辑器、停在 30×18 模板上（地板 + spawn + exit 已经在那儿了）。
2. **画墙** —— 选 **Wall** 工具。演示拖拽涂抹：按住拖动就能铺一整行。在地板上挖一个 **5 格的坑**（用 **Erase** 擦掉 5 块地板），然后在坑下方 2 行处涂一条**下层台子**，给个能落脚的地板。
3. **Spawn / Exit** —— 模板里已经有了。选 **Spawn** 工具，点一下把它移到上层地板的左端。选 **Exit**，点一下移到上层地板的右端。说一句：每页 1 个 spawn，每关 1 个 exit。
4. **一个 hazard** —— 选 **Spike**，在参数面板把 dir 设成 **up**，在下层台子上点一下，这样掉进去时有根尖刺要躲。（可选：在路径上方加一门 **Cannon**，dir = right，顺便展示第二种 hazard 和参数面板。）
5. **试玩** —— 点 **▶ Play**。玩一遍：出生点按 **→**，掉进坑里，落到台子上躲开尖刺，**→** 撞到远处的墙，反弹，再爬回上面（从台子上 **↑** 或者跳），**→** 到出口。也演示一次死亡，然后再点 **▶ Play** —— 强调它瞬间重开。
6. **保存** —— 回到编辑模式，点 **Save**。（提一句自动尺寸：保存时页面会裁到你最靠外的那个元素。）
7. **起名字** —— 进网站上的发布流程。给个标题 + 简短描述。
8. **发布流程** —— 展示**试玩门槛**：发布前它会让你先通关一次。点发布 → 它把你丢进一次静默测试 → 通关 → 「Test passed ✓ Publish?」→ 确认。展示生成出来的 **PNG 缩略图**。
9. **发布后** —— 落到这一关的 play 页；展示它现在出现在你的 **profile** 和 **/explore** 里，带着缩略图和可分享的 URL。提一句**改版替换**：编辑一个已发布的关卡会 fork 出一个草稿，重新发布时把它换回线上的那一版。

片尾卡：levelcraft.gg + Discord 链接。

---

# Glamour / B-roll 镜头清单（两个视频通用）

- **通关录像**：从 10 个种子关卡（`level-01` … `level-10`）里挑 2–3 个屏幕上看着最热闹的——录干净的全通关。这些是你「看，关卡能做得多丰富」的插入镜头。
- **编辑器片段**：10–15 秒的拖拽涂墙、丢几个 hazard、打开参数面板。（上面第 2–4 步本身就够当这个用。）
- **levelcraft.gg 落地镜头**：慢慢滚动首页——Hero 视频在放、StatsStrip、Featured/Latest 关卡卡片带着 PNG 缩略图。片尾卡素材。
- **/explore 网格**：那面关卡缩略图墙，慢滚。
- **多页**：一个带 Teleport 的关卡，抓住页与页之间淡出黑场转场的瞬间——支撑「关卡可以做得很大」那句话。
- **profile 页**（`/u/Autinhorse`）：你已发布的关卡，play / like / 评分计数都看得见——证明这平台是真实上线的。

# 录制清单（来自 handoff）

- 1080p60 OBS，只录浏览器窗口，别漏系统声音。
- 麦克风测试——USB 或领夹麦，不要用笔记本自带麦。
- 提前把 demo 关卡摆好，让编辑器一打开就是干净的。
- 原始素材每条多录几遍，回头再剪。配音放最后。
