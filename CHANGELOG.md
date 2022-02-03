# Changelog

All notable changes to the "vscode-dotnet-auto-attach" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2020-03-08

### Fixed
- Changed publisher reference of csharp extension to the changed one.

## [1.1.0] - 2019-02-23

### Added
- Added project property to DotNetAutoAttach DebugConfiguration of launch.json. The project property allow to start a specific project and let you bypass the quick pick menu.

### Changed

- Changed naming of debug process in debug panel, now includes project name of the project which the debug session belongs to.

### Fixed

- InitalConfiguration & launch.json are now generated if they were not present.
- Fixed bug where dotnet watch could not rebuild a project if debugger hangs on breakpoint.


## 1.0.0 - 2018-09-25

- Initial release

[Unreleased]: https://gitlab.com/dennismaxjung/vscode-dotnet-auto-attach/compare/v1.1.1...develop
[1.1.0]: https://gitlab.com/dennismaxjung/vscode-dotnet-auto-attach/compare/v1.0.0...v1.1.0
[1.1.1]: https://gitlab.com/dennismaxjung/vscode-dotnet-auto-attach/compare/v1.1.0...v1.1.1
