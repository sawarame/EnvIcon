# EnvIcon

Customize and visualize your environment by automatically modifying site favicons.

## Overview

EnvIcon is a Chrome extension designed for developers and QA engineers to easily distinguish between different environments (Development, Staging, and Production) by adding a labeled overlay to the site's favicon.

## Features

- **Environment Detection**: Automatically detects environments based on user-defined hostnames.
- **Visual Indicators**: Overlays the site favicon with a semi-transparent background and colored text:
  - **Production (PROD)**: Red text for high-risk environments.
  - **Staging (STG)**: Blue text for testing and verification environments.
  - **Development (DEV)**: Green text for local and development environments.
- **Toggle Feature**: Easily enable or disable the favicon replacement feature from the options page.

## Configuration

1. Open the extension's **Options** page.
2. Enter the hostnames for your environments:
   - **Production Hostname**: e.g., `app.example.com`
   - **Staging Hostname**: e.g., `stg-app.example.com`
   - **Development Hostname**: e.g., `localhost` or `dev-app.local`
3. Click **Save**.

## Development

### Prerequisites

- Node.js
- npm

### Build

To build the extension, run:

```bash
npm run build
```

This will compile the TypeScript source files and generate the final extension package in the `EnvIcon` directory, as well as a `EnvIcon.zip` file for distribution.
