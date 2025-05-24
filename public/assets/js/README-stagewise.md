# Stagewise Toolbar Integration

This directory contains `stagewise-init.js`, which integrates the stagewise toolbar into the WhatsApp Gateway application. The stagewise toolbar is a development tool that connects frontend UI to code AI agents in your code editor.

## Features

- Allows developers to select elements in the web app
- Provides ability to leave comments on UI elements
- Enables AI agents to make changes based on UI context

## Implementation Details

- The toolbar is only activated in development mode
- Integration happens through the main layout file (`views/layouts/main.ejs`)
- Browser detection is used to ensure it only runs in local development environments

## How It Works

1. The environment middleware (`server/middleware/env.middleware.js`) exposes the NODE_ENV to templates
2. The main layout conditionally includes the stagewise script in development mode
3. The stagewise-init.js script checks if we're in a local environment before initializing
4. A symbolic link in `public/node_modules/@stagewise` makes the toolbar assets accessible

## Usage

No additional configuration is required. The toolbar will automatically appear in development mode when viewing the application in a browser. To interact with the toolbar:

1. Select UI elements on the page
2. Add comments or suggestions
3. Use your AI-powered code editor to implement the changes

## Troubleshooting

If the toolbar doesn't appear:

- Ensure you're in development mode (`NODE_ENV=development`)
- Check browser console for any errors
- Verify the symbolic link to the stagewise package exists
- Make sure the app is running on localhost or a .local domain
