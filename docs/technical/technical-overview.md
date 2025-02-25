# Technical Documentation

This section contains detailed technical documentation for developers working with Roo Code.

## Contents

### Configuration
- [Settings Guide](./settings/index.md) - Complete guide to Roo Code settings
- [API Configuration](./settings/api-config.md) - API and model configuration

### Testing
- [Testing Overview](./testing/index.md) - Complete testing documentation
- [Unit Testing](./testing/unit-tests.md) - Jest unit testing guide
- [Integration Testing](./testing/integration-tests.md) - VSCode integration testing
- [Service Testing](./testing/service-tests.md) - Service boundary testing

### Implementation
- [Architecture](./implementation/architecture.md) - System architecture overview
- [API Integration](./implementation/api-integration.md) - API integration details
- [Browser Automation](./implementation/browser-automation.md) - Browser control features
- [File Operations](./implementation/file-operations.md) - File system interactions
- [Command Execution](./implementation/command-execution.md) - Terminal command handling

### Development
- [Build Process](./development/build.md) - Building from source
- [Development Setup](./development/setup.md) - Setting up the development environment
- [Debugging Guide](./development/debugging.md) - Debugging tips and procedures

## Directory Structure

```
technical/
├── settings/          # Configuration documentation
├── testing/          # Testing documentation
├── implementation/   # Implementation details
└── development/     # Development guides
```

## Best Practices

- Follow the testing guidelines in the testing documentation
- Maintain test coverage requirements (80% across all metrics)
- Use the logger from `src/utils/logging/index.ts`
- Follow linting rules and get approval for any rule changes
- Use Tailwind for styling UI components