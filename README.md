# 학급 알림판 (Class Info)

A modern, real-time class notice board application built with SvelteKit and Convex. Perfect for teachers and students to manage assignments, announcements, and class information.

## ✨ Features

### 📢 Notice Management
- **Real-time Updates** - Instant synchronization across all devices using Convex
- **Notice Categories** - Organize by type: 수행평가 (Performance Assessment), 숙제 (Homework), 준비물 (Supplies), 기타 (Other)
- **Due Date Tracking** - Automatic sorting and past/current notice separation
- **Smart Grouping** - Notices grouped by date with today/past indicators

### 📱 Responsive Design
- **Mobile-First** - Optimized for smartphones and tablets
- **Dense Mobile Layout** - Compact information display on small screens
- **Progressive Text Sizing** - Three breakpoints for optimal readability
- **Touch-Friendly** - Easy navigation and interaction on mobile devices

### 📝 Rich Content Support
- **Markdown Support** - Full markdown formatting in notice details
- **Media Embedding** - Support for images and YouTube videos
- **Smart Line Breaks** - Natural line break handling in admin editor
- **Rich Typography** - Hierarchical headers (H1 largest, H2-H6 same size)

### 🔒 Admin Features
- **PIN Authentication** - Secure admin access
- **CRUD Operations** - Create, read, update, delete notices
- **Markdown Editor** - Large textarea with markdown hints and examples
- **Real-time Preview** - Changes appear instantly on main page

### 📋 Smart Features
- **Notice Details** - Click any notice for full markdown-rendered content
- **Copy to Clipboard** - One-click copy of performance assessments for sharing
- **Smart Grouping** - Multiple notices per day combined with commas
- **First-line Preview** - Main page shows clean first line (markdown stripped)

### 🎨 Modern UI
- **Clean Design** - Minimalist Korean-friendly interface
- **Subtle Animations** - Hover effects and smooth transitions
- **Consistent Styling** - Unified color scheme and typography
- **Navigation Arrows** - Visual indicators for clickable items

## 🛠️ Technology Stack

- **Frontend**: SvelteKit 5 with TypeScript and Svelte Runes
- **Backend**: Convex (real-time database and serverless functions)
- **Styling**: TailwindCSS v4 with responsive design
- **Markdown**: Marked.js with custom YouTube embed support
- **Build System**: Turborepo with pnpm workspaces
- **Deployment**: Optimized for modern web standards

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
pnpm dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the web application.
Your app will connect to the Convex cloud backend automatically.





## Project Structure

```
class-info/
├── apps/
│   ├── web/         # Frontend application (SvelteKit)
├── packages/
│   └── backend/     # Convex backend functions and schema
```

## Available Scripts

- `pnpm dev`: Start all applications in development mode
- `pnpm build`: Build all applications
- `pnpm dev:web`: Start only the web application
- `pnpm dev:setup`: Setup and configure your Convex project
- `pnpm check-types`: Check TypeScript types across all apps
