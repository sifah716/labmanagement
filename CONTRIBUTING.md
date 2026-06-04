# Contributing to Lab Management System

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Check if the feature has been suggested
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes:
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed
   - Test your changes thoroughly

4. Commit your changes:
   ```bash
   git commit -m "Add: brief description of changes"
   ```
   
   Use conventional commit messages:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for updates to existing features
   - `Refactor:` for code refactoring
   - `Docs:` for documentation changes
   - `Style:` for formatting changes
   - `Test:` for test-related changes

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request:
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/labmagementdkv.git
   cd labmagementdkv
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

## Code Style Guidelines

### JavaScript
- Use ES6+ features
- Use `const` and `let`, avoid `var`
- Use arrow functions where appropriate
- Use template literals for strings
- Add JSDoc comments for functions
- Keep functions small and focused

### HTML
- Use semantic HTML5 elements
- Proper indentation (2 spaces)
- Add ARIA labels for accessibility

### CSS
- Use BEM naming convention
- Mobile-first approach
- Use CSS variables for colors
- Group related properties

### Database
- Use parameterized queries
- Add proper indexes
- Document schema changes

## Testing

Before submitting a PR:
1. Test all functionality manually
2. Test on different browsers
3. Test responsive design
4. Check for console errors
5. Verify no breaking changes

## Documentation

Update documentation when:
- Adding new features
- Changing API endpoints
- Modifying configuration
- Updating dependencies

## Questions?

Feel free to:
- Open an issue for questions
- Join our discussions
- Contact the maintainers

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
