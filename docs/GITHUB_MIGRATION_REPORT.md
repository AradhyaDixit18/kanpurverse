# GitHub migration report

| Item | State (13 Nov 2026) |
|---|---|
| Source repo | github.com/AradhyaDixit18/kanpurverse (public) |
| Target | github.com/velto-studios/kanpurverse: **404, transfer not accepted yet** |
| Target account | `velto-studios` is a personal GitHub account (primary email sparkstudios763@gmail.com), not an organisation |
| Method | Official Settings → Transfer, already started in an earlier session; the recipient still has to accept it |
| Blocker | The accept link was emailed to sparkstudios763@gmail.com, which isn't signed in on this machine's browser |
| Local repo | branch `feature/single-player-cinematic`; new commits b05f480, 18465b7; not pushed (the sandbox has no GitHub credentials) |
| Force-push / deletion / visibility change | none |

After acceptance: GitHub redirects the old URL. Run `git remote set-url origin https://github.com/velto-studios/kanpurverse.git` and check that the default branch, history and three branches are all there.
