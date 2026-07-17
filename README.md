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


## Three-team final

Round 3 contains eight Championship teams split across two courts of four.

Exactly three teams qualify for the final:

- The first-place team on Championship Court 1
- The first-place team on Championship Court 2
- The higher-scoring third-place team across the two courts

The best-third-place tie-break is:

1. Round 3 score
2. Cumulative tournament score
3. Team name alphabetically

Second-place teams do not qualify under this format. All non-qualifiers move into Plate play.


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
