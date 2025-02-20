# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.2.0](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.1.8...v1.2.0) (2025-02-20)


### Features

* allow user to automatically attach to externally executed dotnet watch process ([85d8695](https://github.com/murugaratham/vscode-dotnet-watch/commit/85d8695134f6dba0a7b93f53fbc82130c7290033)), closes [#18](https://github.com/murugaratham/vscode-dotnet-watch/issues/18)

### [1.1.8](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.1.6...v1.1.8) (2022-09-26)


### Bug Fixes

* **task-service:** allow user to use workspaceFolder ([f1cb8ba](https://github.com/murugaratham/vscode-dotnet-watch/commit/f1cb8ba55877bcf36da1470393639191e4c71694)), closes [#14](https://github.com/murugaratham/vscode-dotnet-watch/issues/14)

### [1.1.7](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.1.6...v1.1.7) (2022-09-26)

### [1.1.5](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.1.4...v1.1.5) (2022-08-07)


### Bug Fixes

* **npm:** update @types/vscode & typescript ([b29e0cf](https://github.com/murugaratham/vscode-dotnet-watch/commit/b29e0cf62ae1d2ab7b5ae1abf624654d994fddf3))

### [1.1.4](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.1.3...v1.1.4) (2022-08-07)

### [1.1.3](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.1.2...v1.1.3) (2022-05-26)

### [1.1.1](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.1.0...v1.1.1) (2022-03-01)


### Bug Fixes

* **task-service:** if there's no active files, vscode-variables throws ([f2d5055](https://github.com/murugaratham/vscode-dotnet-watch/commit/f2d50552b28a19b799bd03ac8240c58929eac911))

## [1.1.0](https://github.com/murugaratham/vscode-dotnet-watch/compare/v1.0.4...v1.1.0) (2022-02-25)


### Features

* **task-service.ts:** tryLoadLaunchProfile instead of prompting error (can't find launchSettings) ([9204e4c](https://github.com/murugaratham/vscode-dotnet-watch/commit/9204e4c9a085dbbabb67869a4472e72f66901aa3))

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
