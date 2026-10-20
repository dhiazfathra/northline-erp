# Final deploy + smoke (2026-10-20)

`pnpm deploy:prod` after 40f9357 (Worker version 407e5f9d). Then `pnpm switch:prod <branch>` per branch, login + trial balance (2033 and 2000-2099), wait 15s for propagation; restored to manufaktur.
Distinct full-range hashes prove each branch served its own data. Verdict: pass on all four.

```
retail try1: retail login 200 tb 200 2 d7517139  all 5070 b1976711 
trade try1: trade login 200 tb 200 702 e705e49d  all 4951 928b59ba 
contractor try1: contractor login 200 tb 200 2 d7517139  all 2123 dda9f7af 
manufaktur try1: manufaktur login 200 tb 200 2178 105cb22f  all 5611 fa506318 
```
