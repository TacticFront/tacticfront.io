# TacticFront

<p align="center">
  <picture>
    <img src="resources/tacticfront/TacticFront-logo-small.png" alt="OpenFrontIO Logo" width="300">
  </picture>
</p>

TacticFront is an online real-time strategy game focused on territorial control and alliance building. Players compete to expand their territory, build structures, and form strategic alliances in various maps based on real-world geography which builds off of elements found in early versions of Openfront.

## 🏛️ Project Lineage

This project, TacticFront, is a fork and major rewrite of [OpenFront.io](https://github.com/openfrontio/OpenFrontIO),  
which itself is a fork and rewrite of [WarFront.io](https://github.com/WarFrontIO).  
Credit to all previous contributors and teams.

# Licensing

The Openfront project used a dual-licensing approach at the time of our fork:

- Code in the `server/` and `core/` directory is licensed under MIT
- Client code (in the `client/` directory) is licensed under GPL v3 see `src/client/` for full license texts.

We have preserved all headers and license text from the time of our fork.

This project is a fork of OpenFront.io, which at the time of fork included a root-level MIT license.  
However, we were made aware after our fork of a note in the README indicating the project or parts thereof were covered by the GPL.  
In order to comply with potential GPL requirements, all code from the original repo subsequent to that notice might be treated as GPL v3, and the full GPL license text is included in the subfolder.  
No attempt has been made to retroactively add file-level headers to code where authorship or original intent is unclear.

This project is therefore released under GPL v3 for any code affected by that notice. We make no warranties regarding the legal status or condition of any code in this repository. You should consult with your own legal counsel before using or redistributing any portion of this codebase.
We are publishing this code solely to comply with potential open-source licensing requirements and assert our rights to do so under either the MIT or GPL v3 licenses, as may apply.

# Additional Licensing information

> **Note:**  
> Some visual assets (logos, images) referenced by this project may NOT included in this repository due to third-party licensing restrictions. See `resources/tacticfront` and subfolders for details.

NOTICE: Assets that may be referenced or required by this project (such as logos and images) are NOT included in this repository. Some assets are licensed from Freepik (https://www.freepik.com/) and may not be distributed or sublicensed under GPL or any other open-source license. If you need these assets, please obtain them directly from Freepik, and follow their terms of service.

## 🌟 Features

- **Real-time Strategy Gameplay**: Expand your territory and engage in strategic battles
- **Alliance System**: Form alliances with other players for mutual defense
- **Multiple Maps**: Play across various geographical regions including Europe, Asia, Africa, and more
- **Resource Management**: Balance your expansion with defensive capabilities
- **Cross-platform**: Play in any modern web browser

## 📋 Prerequisites

- [npm](https://www.npmjs.com/) (v10.9.2 or higher)
- A modern web browser (Chrome, Firefox, Edge, etc.)

## 🚀 Installation

1. **Clone the repository**

2. **Install dependencies**

   ```bash
   npm i
   ```

## 🎮 Running the Game

### Development Mode

Run both the client and server in development mode with live reloading:

```bash
npm run dev
```

This will:

- Start the webpack dev server for the client
- Launch the game server with development settings
- Open the game in your default browser

### Client Only

To run just the client with hot reloading:

```bash
npm run start:client
```

### Server Only

To run just the server with development settings:

```bash
npm run start:server-dev
```

## 🛠️ Development Tools

- **Format code**:

  ```bash
  npm run format
  ```

- **Lint code**:

  ```bash
  npm run lint
  ```

- **Lint and fix code**:
  ```bash
  npm run lint:fix
  ```

## 🏗️ Project Structure

- `/src/client` - Frontend game client
- `/src/core` - Shared game logic
- `/src/server` - Backend game server
- `/resources` - Static assets (images, maps, etc.)

## 📝 License

This project is licensed under the terms found in the [LICENSE](LICENSE) file.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. [Join the TacticFront community on Discord!](https://discord.gg/vNcACpjfFB)

1. Fork the repository
1. Create your feature branch (`git checkout -b amazing-feature`)
1. Commit your changes (`git commit -m 'Add some amazing feature'`)
1. Push to the branch (`git push origin amazing-feature`)
1. Open a Pull Request

## 🌐 Translation

Translators are welcome! Please feel free to help translate into your language.
How to help?

1. Request to join the translation [Discord](https://discord.gg/rUukAnz4Ww)
1. Go to the project's Crowdin translation page: [https://crowdin.com/project/openfront-mls](https://crowdin.com/project/openfront-mls)
1. Login if you already have an account/ Sign up if you don't have one
1. Select the language you want to translate in/ If your language isn't on the list, click the "Request New Language" button and enter the language you want added there.
1. Translate the strings

### Project Governance

- The project maintainers have final authority on all code changes and design decisions
- All pull requests require maintainer approval before merging
- The maintainers reserve the right to reject contributions that don't align with the project's vision or quality standards

- By submitting any code change you are confirming that you have the rights to the code or changes and are allowing them to be distributed under the terms of the project license. Accepted changes may be used in TacticFront.io commercially.

### Contribution Path for New Contributors

To ensure code quality and project stability, we use a progressive contribution system:

1. **New Contributors**: Limited to UI improvements and small bug fixes only

   - This helps you become familiar with the codebase
   - UI changes are easier to review and less likely to break core functionality
   - Small, focused PRs have a higher chance of being accepted

2. **Established Contributors**: After several successful PRs and demonstrating understanding of the codebase, you may work on more complex features

3. **Core Contributors**: Only those with extensive experience with the project may modify critical game systems

### How to Contribute Successfully

1. **Before Starting Work**:

   - Open an issue describing what you want to contribute
   - Wait for maintainer feedback before investing significant time
   - Small improvements can proceed directly to PR stage

2. **Code Quality Requirements**:

   - All code must be well-commented and follow existing style patterns
   - New features should not break existing functionality
   - Code should be thoroughly tested before submission
   - All code changes in src/core _MUST_ be tested.

3. **Pull Request Process**:

   - Keep PRs focused on a single feature or bug fix
   - Include screenshots for UI changes
   - Describe what testing you've performed
   - Be responsive to feedback and requested changes

4. **Testing Requirements**:
   - Verify your changes work as expected
   - Test on multiple systems/browsers if applicable
   - Document your testing process in the PR

### Communication

- Be respectful and constructive in all project interactions
- Questions are welcome, but please search existing issues first
- For major changes, discuss in an issue before starting work

### Final Notes

Remember that maintaining this project requires significant effort. The maintainer appreciates your contributions but must prioritize long-term project health and stability. Not all contributions will be accepted, and that's okay.

Thank you for helping make TacticFront better!
