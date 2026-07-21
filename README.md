# Stealth-Ex Chrome Extension

A sleek, stealthy Chrome extension that uses Manifest V3 and the OpenAI API to act as an intelligent screen reader. It detects questions on the active webpage and elegantly overlays the direct answers.

## Features
- **Intelligent DOM Scanning:** Automatically detects questions on the webpage.
- **Direct Answers:** Queries `gpt-4o` for the precise answer without regurgitating context.
- **Glassmorphism UI:** A beautiful, non-intrusive floating overlay.
- **Secure Setup:** Stores your OpenAI API key safely in `chrome.storage.local`.

## Installation (Developer Mode)
1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the directory containing the extension.

## Configuration
1. After installing, click the extension icon or navigate to the extension's **Options** page.
2. Enter your OpenAI API Key and click **Save**.

## Architecture
- `src/background/index.js`: Handles secure API communication.
- `src/content/index.js`: Scans the DOM for questions.
- `src/content/ui.js`: Manages the injection of the UI overlay.
- `src/styles/content.css`: Contains all glassmorphism styling and typography rules.
- `src/options/`: Contains the options page UI and logic.
