# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.0.4](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.0.2...v1.0.4) (2022-02-25)

### [1.0.3](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.0.1...v1.0.3) (2022-02-14)

## [1.1.1] - 2020-03-08

### Fixed

- Changed publisher reference of csharp extension to the changed one.

## [1.1.0] - 2019-02-23

### Added

- Added project property to DotNetWatch DebugConfiguration of launch.json. The project property allow to start a specific project and let you bypass the quick pick menu.

### Changed

- Changed naming of debug process in debug panel, now includes project name of the project which the debug session belongs to.

### Fixed

- InitalConfiguration & launch.json are now generated if they were not present.
- Fixed bug where dotnet watch could not rebuild a project if debugger hangs on breakpoint.

## 1.0.0 - 2018-09-25

- Initial release

[unreleased]: https://gitlab.com/dennismaxjung/vscode-dotnet-auto-attach/compare/v1.1.1...develop
[1.1.0]: https://gitlab.com/dennismaxjung/vscode-dotnet-auto-attach/compare/v1.0.0...v1.1.0
[1.1.1]: https://gitlab.com/dennismaxjung/vscode-dotnet-auto-attach/compare/v1.1.0...v1.1.1
