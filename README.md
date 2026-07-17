# King & Queen of the Court Scoreboard

A static, GitHub Pages-ready tournament scoreboard for a four-court King/Queen of the Court event.

## Features

- Choose any tournament size from 15 to 25 teams
- Four live court scoreboards
- Configurable 10, 15 or 20-minute round timer
- Add and subtract points
- Automatic ranking on each court
- Highlights the bottom two Championship teams
- Automatically moves those teams into the Plate competition
- Automatic court layouts:
  - Round 1: 4 Championship courts
  - Round 2: 3 Championship + 1 Plate
  - Round 3: 2 Championship + 2 Plate
  - Round 4 onward: 1 Championship + 3 Plate
- All teams continue playing every round
- Saves tournament state in the browser using localStorage
- Responsive for laptop, tablet and phone screens

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css` and `app.js` to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose the `main` branch and `/root`, then save.
6. GitHub will provide the public scoreboard URL.

## Tournament logic

At the end of each round, click **Finish round & advance**.

On every Championship court:
- Teams are ranked by points.
- The bottom two move into the Plate group.
- Remaining Championship teams are redistributed over the correct number of courts.
- Plate teams are redistributed over the remaining courts.
- Scores reset for the new round.
- Cumulative scores are retained internally to help seed teams across courts.

Plate teams are never removed, so everyone continues playing.

## Important operational note

The app currently treats each court's score as the number of points won on the King side during that round. It does not control physical team rotation; the court official still manages who moves on and off the King side.
