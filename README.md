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
