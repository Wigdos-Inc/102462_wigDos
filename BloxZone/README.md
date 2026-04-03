# BloxZone Platform 🎮

A professional peer-to-peer gaming platform similar to Roblox, built with modern HTML5, CSS3, and JavaScript. Perfect for GitHub Pages hosting with no backend required!

## ✨ Features

- 🔐 **User Authentication** - Register and login system (client-side with localStorage)
- 👥 **Friends System** - Send, accept, and manage friend requests
- 🎨 **Avatar Customization** - Choose from 6 unique avatars with emoji icons
- 🎮 **Game Engine** - Custom game system with reusable game files (like Roblox)
- 🕹️ **3 Playable Games Included**:
  - **Obby Adventure** - Platform jumping obstacle course
  - **Color Clicker** - Fast-paced color matching game
  - **Race Track** - Top-down racing game with lap times
- 🌐 **P2P Multiplayer** - WebRTC-based multiplayer rooms using PeerJS
- 🛠️ **Creator Hub** - Build and publish your own games
- 🎨 **Professional UI** - Modern dark theme with gradient effects and animations
- 📱 **Responsive Design** - Works on desktop and mobile devices

## 📁 File Structure

```
BloxZone-dev/
├── index.html              # Home page with featured games
├── css/
│   └── main.css            # Professional styling with dark theme
├── js/
│   ├── auth.js             # Authentication system
│   ├── friends.js          # Friends management
│   ├── avatar.js           # Avatar system
│   ├── p2p.js              # P2P connection handler
│   └── game-engine.js      # Core game engine
├── games/                  # Game files (similar to Roblox)
│   ├── obby-adventure.js   # Platform jumping game
│   ├── color-clicker.js    # Color matching game
│   └── race-track.js       # Racing game
├── pages/
│   ├── login.html          # Login page
│   ├── signup.html         # Sign up page
│   ├── profile.html        # User profile and friends
│   ├── avatar.html         # Avatar creator
│   ├── games.html          # Games browser with multiplayer
│   ├── player.html         # Game player page
│   └── creator.html        # Creator hub
├── assets/
│   └── images/             # Images and assets
└── README.md               # This file
```

## 🎮 Game System

BloxZone uses a **modular game file system** similar to Roblox. Each game is a JavaScript file with specific callbacks:

```javascript
const myGame = {
    id: 'my-game-id',
    name: 'My Game',
    description: 'Game description',
    thumbnail: 'path/to/image.png',
    
    onInit: function(engine) {
        // Initialize game
    },
    
    onStart: function(engine) {
        // Start game loop
    },
    
    onUpdate: function(engine) {
        // Update every frame
    },
    
    onPlayerJoin: function(engine, playerId, playerData) {
        // Handle player joining
    }
};

// Register the game
gameManager.registerGame(myGame);
```

### Creating New Games

1. Create a new `.js` file in the `games/` folder
2. Define your game object with the required callbacks
3. Register it with `gameManager.registerGame(yourGame)`
4. Include the script in `index.html` and `player.html`

## 🚀 Getting Started

### Option 1: GitHub Pages (Recommended)

1. Push this code to your GitHub repository
2. Go to **Settings** > **Pages**
3. Select **main** branch as source
4. Your site will be live at: `https://yourusername.github.io/BloxZone-dev/`

### Option 2: Local Testing

Simply open `index.html` in your web browser, or use a local server:

```bash
# Python 3
python -m http.server 8000

# Then visit: http://localhost:8000
```

### Option 3: GitHub Pages Multiplayer (No Node)

Use Firebase Realtime Database so server lists are shared across Edge/Chrome/devices while staying fully static-hosted.

1. Create a Firebase project and Realtime Database.
2. Set temporary test rules (replace later with secure rules):

```json
{
    "rules": {
        ".read": true,
        ".write": true
    }
}
```

3. Edit `js/p2p-config.js` and set your database URL:

```javascript
window.BLOXZONE_CLOUD = {
        dbUrl: 'https://your-project-default-rtdb.<region>.firebasedatabase.app',
        authToken: '',
        namespace: 'bloxzone'
};
```

4. Deploy to GitHub Pages and open the same URL in Edge + Chrome.

`js/p2p.js` auto-detects cloud mode from this config and uses shared matchmaking without a Node backend.

### Option 4: Local Node Server (Optional)

If you prefer local backend testing:

```bash
node server.js
```

Then open:

```text
http://localhost:8080
```

## 📖 Usage Guide

### 1. Create an Account
- Click **Sign Up**
- Enter username and password
- Start playing!

### 2. Customize Your Avatar
- Go to **Avatar Creator**
- Choose from 6 emoji avatars: 🙂 🤖 ⚔️ 🧙 🥷 🏴‍☠️
- Save your selection

### 3. Add Friends
- Go to **Profile** page
- Enter friend's username
- They can accept on their profile page

### 4. Play Games
- Browse games on **Home** or **Games** page
- Click **Play Now** to start
- Use keyboard controls (arrows, space, etc.)

### 5. Create Multiplayer Rooms
- Go to **Games** page
- Create a room and share the Room ID
- Friends join using the Room ID
- Play together in real-time!

### 6. Create Your Own Games
- Go to **Creator Hub**
- Fill in game details
- Your game appears in your profile
- (Full game development tools coming soon!)

## 🎯 Included Games

### Obby Adventure 🏃
- **Genre**: Platformer
- **Controls**: Arrow Keys + Space
- **Goal**: Jump across platforms and reach the end
- **Players**: 1-20

### Color Clicker 🎨
- **Genre**: Puzzle/Action  
- **Controls**: Mouse Click
- **Goal**: Click the correct colors before time runs out
- **Players**: 1

### Race Track 🏎️
- **Genre**: Racing
- **Controls**: Arrow Keys
- **Goal**: Complete laps as fast as possible
- **Players**: 1-10

## 🛠️ Technical Details

### Technologies Used
- **HTML5** - Semantic markup and Canvas API for games
- **CSS3** - Modern styling with CSS Grid, Flexbox, and animations
- **JavaScript (ES6)** - Game engine, authentication, P2P networking
- **localStorage** - Client-side data persistence
- **PeerJS** - Simple WebRTC wrapper for P2P multiplayer
- **Canvas API** - 2D game rendering

### Key Features
- ✅ **No backend required** - Runs entirely in the browser
- ✅ **Free hosting** - Perfect for GitHub Pages
- ✅ **P2P multiplayer** - Direct player connections via WebRTC
- ✅ **Modular architecture** - Easy to extend and customize
- ✅ **Professional UI** - Modern dark theme with smooth animations
- ✅ **Mobile friendly** - Responsive design for all devices

### Browser Compatibility
Works in all modern browsers that support:
- localStorage API
- Canvas API
- WebRTC
- ES6 JavaScript

Tested on: Chrome, Firefox, Safari, Edge

## 🎨 Customization

### Changing Colors
Edit CSS variables in `css/main.css`:
```css
:root {
    --primary-color: #00A2FF;
    --secondary-color: #0066CC;
    --accent-color: #00D9FF;
    /* ... */
}
```

### Adding New Avatars
Edit the avatar options in `pages/avatar.html` and add emoji icons.

### Creating New Pages
Use the existing pages as templates - they all include the same header, footer, and styling system.

## ⚠️ Security Notes

**Important:** This is a demo/learning platform!

- ❌ Passwords stored in plain text (localStorage)
- ❌ No server-side validation
- ❌ No encryption
- ❌ Data only stored locally (not synced between devices)

**For production use, you need:**
- ✅ Backend server with database
- ✅ Proper authentication (JWT, OAuth)
- ✅ Password hashing (bcrypt)
- ✅ HTTPS encryption
- ✅ Input validation and sanitization

## 🚀 Future Enhancements

Planned features:
- [ ] Visual game editor
- [ ] Script editor for game logic
- [ ] Asset library and marketplace
- [ ] Real-time chat system
- [ ] Game ratings and reviews
- [ ] User profiles with statistics
- [ ] Cloud save system
- [ ] Mobile app versions
- [ ] Achievement system
- [ ] Leaderboards

## 🤝 Contributing

Want to add features? Here are some ideas:
1. Create new games in the `games/` folder
2. Add new avatar options
3. Improve the game engine
4. Add sound effects and music
5. Create better graphics
6. Add more social features

## 📝 License

Free to use and modify for your own projects! No restrictions.

## 🌟 Credits

Built as a learning project inspired by Roblox's platform.
Perfect for students learning web development, game design, or P2P networking!

---

**Made with ❤️ for the BloxZone community**

Need help? Have questions? Want to share your games? Open an issue on GitHub!