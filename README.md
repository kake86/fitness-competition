# 🌟 My Planning Tool

A simple, colorful planning application designed for children to manage their daily and weekly schedules with time-based events and task completion tracking.

## Features

- 📅 **Daily View**: See all events for a specific day, organized by time
- 📆 **Weekly View**: View events across the entire week in a grid layout
- ⏰ **Time-based Events**: Add events with specific times (12-hour format with AM/PM)
- ✅ **Task Completion**: Check off completed tasks with visual feedback
- 💾 **Data Persistence**: Events are automatically saved to your browser's local storage
- 📁 **File Export/Import**: Save your data to a file or load from a saved file

## Advanced Setup (Supabase + Gemini)

This project supports:

- **Supabase** as a backend provider (Google auth + shared competition state)
- **Gemini** for AI coaching suggestions in the stats view

See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for SQL, auth provider setup, and env vars.

## Getting Started

**Requires:** Node.js (download from [nodejs.org](https://nodejs.org/) if needed)

Open PowerShell and navigate to the project folder:

```powershell
cd C:\Users\kangl\planning-tool
npm install
```
*(Installs packages - wait 1-2 minutes)*

After `npm install` finishes, start the app:

```powershell
npm run dev
```
*(Starts the app - you'll see a URL like http://localhost:5173)*

Open that URL in your browser. Done!

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory. You can preview the production build with:

```bash
npm run preview
```

## How to Use

1. **Switch Views**: Use the "Daily" or "Weekly" buttons at the top to switch between views
2. **Add Events**: Click the "➕ Add Event" button, enter a title, optionally set a time, and click "✓ Add"
3. **Complete Tasks**: Click the checkbox next to any event to mark it as completed
4. **Navigate Dates**: Use the arrow buttons (← →) to move between days or weeks
5. **Save/Load**: Use the footer buttons to save your data to a file or load from a previously saved file

## Project Structure

```
planning-tool/
├── public/
│   └── index.html          # HTML entry point
├── src/
│   ├── App.jsx             # Main application component
│   ├── App.css             # Child-friendly styling
│   ├── DailyView.jsx       # Daily schedule view
│   ├── WeeklyView.jsx      # Weekly schedule view
│   ├── EventForm.jsx       # Form to add new events
│   ├── EventItem.jsx       # Individual event display
│   ├── dataUtils.js        # Data persistence utilities
│   ├── data.json           # Initial data structure
│   └── main.jsx            # React entry point
├── package.json            # Project dependencies
└── vite.config.js          # Vite configuration
```

## Design Principles

This tool is designed with children in mind:

- **Large, colorful buttons** for easy interaction
- **Simple, friendly interface** with clear visual hierarchy
- **Immediate visual feedback** when tasks are completed
- **Easy-to-read fonts** and high contrast colors
- **Touch-friendly** with minimum 44px touch targets
- **Fun, approachable design** with emojis and cheerful colors

## Browser Support

This application works best in modern browsers that support:
- ES6+ JavaScript
- CSS Grid and Flexbox
- Local Storage API
- File API (for import/export)

## License

This project is open source and available for personal use.
