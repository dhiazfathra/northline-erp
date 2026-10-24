# Loop prompt

One session per item keeps the context small; `docs/strategy/loop/state.json` is the hand-off between sessions.
Start or resume with:

```
/strategy-loop
Run `bun loop status` and work the current item to `done` through `bun loop next` and `bun loop advance`. Stop on any
STOP line and report it with the evidence path. At the end, report the PR link and the evals result.
```

After the owner merges the item's PR, a new session with the same prompt starts the next item.
