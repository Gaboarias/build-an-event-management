# Eventos Project - Setup Instructions

## Project Structure
This is a web-based event management system built with HTML, JavaScript, and browser's localStorage for data persistence.

## Setup Instructions

1. Extract all files from the zip archive to a directory on your computer.

2. To run the project:
   - Option 1: Using Visual Studio Code
     * Install the "Live Server" extension in VS Code
     * Right-click on `index.html` and select "Open with Live Server"
     * The application will open in your default browser

   - Option 2: Using any web server
     * Deploy these files to any web server
     * Access index.html through the web server

   - Option 3: Direct browser opening
     * You can open index.html directly in a browser, but some features might be limited due to browser security restrictions
     * For full functionality, it's recommended to use a local web server (Option 1 or 2)

## Important Notes
- The application uses localStorage to store data, which means all data is saved in your browser
- Each browser maintains its own separate localStorage, so data won't be shared between different browsers
- Clearing browser data/cache will erase the stored information

## Files Description
- index.html: Main entry point
- eventos.html: Event management interface
- artists.html: Artist management
- venues.html: Venue management
- config.html: Configuration settings
- admin_user_setup.js: User management functionality
- Other HTML files: Various application features and components

## Browser Compatibility
- Tested and compatible with modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript must be enabled
- LocalStorage must be supported and enabled

## Development
If you want to modify the code:
1. Use any text editor or IDE (VS Code recommended)
2. Make your changes
3. Test using one of the setup methods above
