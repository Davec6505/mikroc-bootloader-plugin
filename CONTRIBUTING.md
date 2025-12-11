# Contributing to MikroC PIC32 Bootloader Extension

Thank you for your interest in contributing! Here's how you can help:

## Reporting Issues

- Check if the issue already exists
- Include VS Code version, OS, and extension version
- Provide steps to reproduce
- Include relevant terminal output or error messages

## Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages: `git commit -m "Add: description of feature"`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request

## Development Setup

```bash
# Clone repository
git clone https://github.com/Davec6505/mikroc-bootloader-plugin.git
cd mikroc-bootloader-plugin

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in debug mode
# Press F5 in VS Code
```

## Code Style

- Follow existing TypeScript conventions
- Run `npm run lint` before committing
- Add comments for complex logic
- Update documentation for new features

## Testing

- Test with actual PIC32 hardware when possible
- Test error conditions (device not connected, invalid hex file, etc.)
- Verify terminal output is helpful

## Documentation

- Update README.md for user-facing changes
- Update DEVELOPER_GUIDE.md for code changes
- Add entries to CHANGELOG.md

## Questions?

Open an issue for discussion before major changes.
