# Personal Planner

Minimalist mobile-first task manager.

## How to Run
This application uses modern ES Modules.
- **GitHub Pages**: Works out of the box.
- **Locally**: You must use a local server because browsers block modules on `file://`.
  - **Option 1**: Double click `start_server.bat` (requires Python).
  - **Option 2**: In VS Code, right-click `index.html` -> "Open with Live Server".

A lightweight, mobile-first task manager with local persistence and automation. Designed to replace simple `.txt` to-do lists.

## Features

- **⚡️ ASAP vs Scheduled**: Distinct buckets for urgent tasks and daily planning.
- **📅 Mobile-First UX**: Large touch targets, "Move to Next Day" (➡️) swipe/action.
- **💾 LocalStorage**: Data stays in your browser. No login, no servers.
- **🔄 Recurring Tasks**: Automate daily routines with simple tags.
- **🧹 Auto-Cleanup**: Old days are automatically pruned from storage to keep the app light.
- **🌓 Dark Mode**: Adapts to your system or toggle manually.

## Usage

### Adding Tasks
- **Standard**: Type and hit Enter.
- **Recurring**: Add a tag at the end:
  - `Running /d` -> Daily
  - `Review Goals /w` -> Weekly
  - `Pay Bills /m` -> Monthly

### Managing Tasks
- **Complete**: Check the box. It disappears after 1.5s.
- **Reschedule**: Tap the ➡️ arrow to move a task to the next day.
- **Manage Recurring**: Click the "Gestionar Recurrentes" link at the bottom.

## Deployment (GitHub Pages)

This project is built with Vanilla HTML/CSS/JS, making it instantly deployable.

1.  **Initialize Git**
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```

2.  **Create Repo & Push**
    - Create a new repository on GitHub (e.g., `planner`).
    - Connect and push:
    ```bash
    git remote add origin https://github.com/YOUR_USER/planner.git
    git branch -M main
    git push -u origin main
    ```

3.  **Activate Pages**
    - Go to **Settings** -> **Pages**.
    - Set **Source** to `main` branch.
    - Save.
    - Your app will be live at `https://YOUR_USER.github.io/planner/`.
