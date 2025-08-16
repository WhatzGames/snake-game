# Snake-Game Project

This project is an enhanced clone of the traditional snake-game.
It uses plain HTML, CSS and javascript and the game is rendered using a canvas.
The sources are located under `tests/` while the source is available within the `src/` directory.

## Build & Commands

- Lint everything: `deno lint`
- Fix linting: `deno lint --fix`
- Run tests: `deno test`
- Run tests for directory: `deno test tests/`
- Run single test: `deno test tests/file.test.ts`

### Development Environment

- no external dependencies
- deno is used for testing

## Code Style

- pure HTML, CSS and Javascript
- javascript: strict mode with ES Modules
- Tabs for indentation (2 spaces for YAML/JSON/MD)
- Single quotes, ALWAYS use semicolons, trailing commas
- Use JSDoc docstrings for documenting type definitions, not `//` comments
- 100 character line limit
- Imports: ES Module style
- Use descriptive variable/function names
- In CamelCase names, use "URL" (not "Url"), "API" (not "Api"), "ID" (not "Id")
- Prefer object oriented programming patterns
- prefer declaring fields and fun

## Testing

- use deno for writing tests

## Architecture

- No external code dependencies
- Hosted using Github pages
- production code is run under `/snake-game`
- development code is run under `/snake-game/{branch-name}`
  
## Security



## Git Workflow

- ALWAYS run `deno fmt` for modified files
- Fix linting errors with `deno lint --fix`
- NEVER use `git push --force` on the main branch
- Use `git push --force-with-lease` for feature branches if needed
- Always verify current branch before force operations

## Configuration

When adding new configuration options, update all relevant places:
1. Environment variables in `.env.example`
2. Configuration schemas in `src/config/`
3. Documentation in README.md

All configuration keys use consistent naming and MUST be documented.
