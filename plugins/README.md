# CreatorSync DAW Plugins

This directory contains the plugin implementations for integrating CreatorSync with major Digital Audio Workstations (DAWs).

## 🎯 Overview

CreatorSync plugins allow you to use The Finisher and Mixmaster1 directly within your favorite DAW, providing seamless workflow integration and real-time collaboration features.

## 📦 Supported Formats

### VST3 (Universal)
- **Compatible DAWs**: Ableton Live, FL Studio, Cubase, Reaper, Studio One, Bitwig, etc.
- **Platforms**: Windows, macOS, Linux
- **Location**: `plugins/vst3/`

### AU (macOS)
- **Compatible DAWs**: Logic Pro, GarageBand, Digital Performer
- **Platforms**: macOS only
- **Location**: `plugins/au/`

### AAX (Pro Tools)
- **Compatible DAWs**: Pro Tools
- **Platforms**: Windows, macOS
- **Location**: `plugins/aax/`

### Standalone
- **Universal executable** that works with any DAW supporting external applications
- **Platforms**: Windows, macOS, Linux
- **Location**: `plugins/standalone/`

## 🔧 Installation

### Automatic Installation
1. Download the plugin installer for your platform from the CreatorSync website
2. Run the installer and select your target DAW(s)
3. Restart your DAW
4. The plugin will appear in your DAW's plugin browser

### Manual Installation
1. Copy the plugin files to your DAW's plugin directory:
   - **VST3**: `%PROGRAMFILES%\Common Files\VST3\` (Windows) or `/Library/Audio/Plug-Ins/VST3/` (macOS)
   - **AU**: `/Library/Audio/Plug-Ins/Components/`
   - **AAX**: `%PROGRAMFILES%\Common Files\Avid\Audio\Plug-Ins\`
2. Restart your DAW
3. Scan for new plugins in your DAW's settings

## 🚀 Features

### Mixmaster1 Plugin
- Professional multi-track mixing console
- Real-time EQ, compression, and effects
- Spectrum analyzer and waveform visualization
- Export to WAV, MP3, FLAC, and other formats
- Integration with CreatorSync beat library

### The Finisher Plugin
- Complete audio production environment
- AI-powered mastering and effects
- Real-time collaboration tools
- Project management and version control
- Cloud sync with web platform

### CreatorSync Bridge
- Real-time marketplace access
- User authentication and subscription management
- Project sync between web and DAW
- Collaboration and sharing features

## 🔐 Activation

1. Launch the plugin in your DAW
2. Click "Login" and enter your CreatorSync credentials
3. The plugin will automatically detect your subscription level
4. Features will unlock based on your plan

## 📊 System Requirements

### Minimum
- **OS**: Windows 10, macOS 10.15, Ubuntu 20.04
- **RAM**: 8GB
- **CPU**: Intel i5 or equivalent
- **DAW**: Any VST/AU/AAX compatible host

### Recommended
- **OS**: Windows 11, macOS 12, Ubuntu 22.04
- **RAM**: 16GB
- **CPU**: Intel i7 or Apple M1/M2
- **DAW**: Latest versions of supported DAWs

## 🐛 Troubleshooting

### Plugin Not Appearing
- Ensure your DAW supports the plugin format
- Rescan for plugins in DAW settings
- Check if plugin files are in the correct directory

### Authentication Issues
- Verify your CreatorSync credentials
- Check internet connection for license validation
- Ensure your subscription is active

### Performance Issues
- Close other applications to free up resources
- Update your DAW to the latest version
- Check if your system meets minimum requirements

## 📞 Support

For plugin-specific support:
- Email: support@creatorsync.com
- Documentation: https://docs.creatorsync.com/plugins
- Community Forum: https://community.creatorsync.com

## 🔄 Updates

Plugins are automatically updated when you log in, or you can manually check for updates in the plugin settings.

## 📄 License

CreatorSync plugins are proprietary software. See main README for licensing terms.
