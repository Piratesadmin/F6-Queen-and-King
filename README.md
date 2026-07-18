# King & Queen Tournament Manager

A browser-based tournament manager for a four-court King & Queen of the Court event.

## Main features

- Select 15–25 teams
- Team-name fields update immediately when the dropdown changes
- 10, 15 or 20-minute rounds
- Four live court scoreboards
- Add/subtract King-side points
- Automatic ranking on each court
- Automatic Championship-to-Plate movement
- Court progression: 4+0, 3+1, 2+2, then 1+3
- Undo the previous round
- Browser autosave
- Download/load tournament save files
- Export standings to CSV
- Responsive phone, tablet and laptop layout

## GitHub Pages

1. Create a public GitHub repository.
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Select `main` and `/ (root)`.
6. Save and open the URL GitHub provides.

## Match-day use

1. Choose the number of teams.
2. Enter all team names.
3. Start the tournament.
4. Add points to teams as they score on the King side.
5. At the end of the timer, press **Finish round & advance**.
6. Review the teams moving into Plate play and confirm.
7. The next round's court assignments are generated automatically.

The app keeps all teams active. Championship teams compete for the main title, while eliminated teams continue on the Plate courts.


## Five-team final

Round 3 contains eight Championship teams split across two courts of four.

Exactly five teams qualify for the final:

- The first- and second-place teams on Championship Court 1
- The first- and second-place teams on Championship Court 2
- The higher-scoring third-place team across the two courts

The best-third-place tie-break is:

1. Round 3 score
2. Cumulative tournament score
3. Team name alphabetically

All other teams move into Plate play.


## Minimum two progressing from each court

During normal Championship rounds, the app never eliminates enough teams to leave fewer than two progressing from a court.

- 6 teams: bottom 2 move to Plate
- 5 teams: bottom 2 move to Plate
- 4 teams: bottom 2 move to Plate
- 3 teams: bottom 1 moves to Plate
- 2 teams: no teams move to Plate

The special Round 3 rule remains unchanged: the winner of each semifinal court and the best third-place team qualify for the three-team final.


## Live standings table

The tournament screen includes a live table that updates whenever a score changes.

It shows:

- Overall rank
- Team name
- Championship or Plate status
- Current court
- Current-round score
- Cumulative tournament points

Championship teams are listed above Plate teams. Within each competition, teams are ranked by cumulative points including their live current-round score.


## Small-event court allocation: 15–19 teams

From Round 2 onward, tournaments with 15–19 total teams use approximately one
Championship court for every four remaining Championship teams.

The main intended case is:

- 8 Championship teams → two Championship courts of four
- All Plate teams → split evenly across Courts 3 and 4

Unused Championship courts automatically become Plate courts, rather than
forcing the standard 3 Championship + 1 Plate or 2 Championship + 2 Plate
template.

The opening round can still use all four courts because every team begins in
the Championship competition.


## Two-court Round 2 pathway

When Round 2 has only two active Championship courts:

- Only the bottom team on each Championship court moves to Plate
- With four teams on each court, six Championship teams remain
- Round 3 is automatically split into two Championship courts of three
- The top two teams on each Round 3 court qualify
- The higher-scoring third-place team across the two courts also qualifies
- The final contains five teams

The best-third-place tie-break remains Round 3 score, then cumulative score,
then team name alphabetically.


## Court availability controls

The tournament screen now has tick boxes for Courts 1–4.

- Unticking a court removes it from play immediately
- Current scores are preserved
- Teams are automatically redistributed across the remaining courts
- Championship play always receives priority
- Before the final, one available court is reserved for Plate play whenever possible
- If only one court is available, Championship continues and Plate play is temporarily paused
- In the final, Championship uses one court and all other available courts are used for Plate play
- Reticking a court automatically adds it back and reschedules the current round

The app displays a warning whenever limited court availability pauses or reduces Plate play.


## Hideable team sidebar

- Shows every team with a participation checkbox
- Unticking a team withdraws them from further play
- Their existing score and cumulative points are preserved
- The current round is immediately rescheduled
- Withdrawn teams remain visible in the live standings
- Reticking restores the team to its previous Championship or Plate competition
- The sidebar can be hidden and reopened
- Select All and Clear All controls are included


## Sidebar layout fix

When the Teams sidebar is hidden, the tournament layout now switches from a
two-column grid to a single full-width column. This prevents the timer, court
controls, statistics, and scoreboards from being compressed into the remaining
space.


## Full-width hidden-sidebar correction

The hidden Teams sidebar now changes the tournament wrapper from a grid into a
full-width block layout. Width limits are explicitly removed from the
tournament view, main content area, round controls, court controls, statistics,
scoreboards, standings, and history panels.


## Team range and automatic starting courts

The tournament now accepts 8–22 teams.

- 8–12 teams start with Courts 1 and 2 available
- 13–22 teams start with all four courts available
- Courts 3 and 4 remain visible in the court controls and can be enabled later
- All existing court-priority, Plate, withdrawal, timer, standings, and progression rules remain active
