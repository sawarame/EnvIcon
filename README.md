# EnvIcon

Customize and visualize your environment by automatically modifying site favicons.

## Installation

- **Chrome Web Store**: [Available here](https://chromewebstore.google.com/detail/envicon-environment-ident/fkapincooiacacfebhkmjoekabbffako)
- **Microsoft Edge Add-ons**: [Available here](https://microsoftedge.microsoft.com/addons/detail/envicon/dnbhopdoagcaockicapmjmifaihmailj)

## Overview

EnvIcon is a Chrome extension designed for developers and QA engineers to easily distinguish between different environments (Development, Staging, and Production) by adding a labeled overlay to the site's favicon.

## Features

- **Dynamic Favicon Overlay**: Adds a customizable badge (up to 4 characters) to the site's favicon.
- **In-Page Badge**: Displays a floating, semi-transparent badge in any corner of the page for clear environment identification.
- **Flexible Environment Detection**: Supports both exact hostnames and Regular Expressions (Regex).
- **Fully Customizable**:
  - **Custom Environments**: Create and manage your own environments (e.g., QA, UAT, Local).
  - **Visual Styling**: Customize badge text, color, and outline color for each environment.
  - **Independent Toggles**: Enable or disable Favicon and In-Page badges separately per environment.
- **Advanced Features**:
  - **Dynamic Detection**: Automatically updates overlays even when a site changes its favicon dynamically.
  - **Priority Management**: Reorder hostnames within an environment using drag-and-drop.
- **Multilingual Support**: Available in both **English** and **Japanese**.

## Configuration

1. Open the extension's **Options** page.
2. Customize your environment settings:
   - **Environments**: Use default PROD/STG/DEV or add custom ones.
   - **Matching Rules**: Add hostnames or enable **Regex** for advanced patterns.
   - **Appearance**: Adjust colors, text, and badge positions.
3. Click **Save** to apply changes.

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
