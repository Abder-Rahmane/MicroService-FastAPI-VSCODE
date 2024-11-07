# Changelog

## 2.7.5

- Update reamde.md

## 2.7.5

- Change badge readme.md

## 2.7.4

- Change readme.md

## 2.7.3

### New Features

- **Local Launch Mode**: Added the ability to launch microservices directly in local mode without using Docker. Users can now choose between Docker and Local launch modes, providing greater flexibility in managing their microservices.

## 2.7.2

- Filtered folders to display only those containing `project-config.json` in the project selection list during microservice creation.

## 2.7.1

- Updated migration files for better compatibility and performance.
- Added functionality to detect the deletion of Docker containers or projects, which automatically updates the TreeView interface in VS Code.

## 2.0.6

  - Automatically opens the logs for the respective project to aid in debugging.

## 2.0.5

- Improved handling of microservice restart failures:
  - Now displays an error message if Docker fails to start due to code issues.
  

## 2.0.4

- Logs are shown regardless of whether any Docker containers are currently running.

## 2.0.3

- Added compatibility with more versions of VS Code.

## 2.0.2

- Update readme.md

## 2.0.1

- Ensures the browser opens only after confirming the server is ready with update command

## 2.0.0

### New Features and Enhancements

- **Browser Launch Control**: Added functionality to open the browser for microservices only after ensuring the server is fully started.
- **Avoid Duplicate Browser Windows**: Implemented a mechanism to avoid opening duplicate browser windows for the same microservice.
- **Improved Status Updates**: Enhanced status reporting for microservices to include detailed messages for already stopped and already running states.
- **Optimized Docker Checks**: Refined the logic to check and handle Docker daemon status more efficiently, reducing unnecessary operations.
- **Enhanced Logging**: Improved logging across all Docker operations for better traceability and debugging.

### Detailed Changes

- **startMicroservice**: 
  - Ensures the browser opens only after confirming the server is ready.
  - Handles already running microservices by logging appropriate messages and avoiding duplicate browser windows.

- **startAllMicroservices**:
  - Manages the browser opening for multiple microservices without duplication.

- **stopMicroservice**:
  - Enhanced to check and report if a microservice is already stopped.

- **stopAllMicroservices**:
  - Consolidates messages for successfully stopped, already stopped, and failed to stop microservices.

## 1.5.9

- Fixed the issue where a double window would open in the browser when deploying a microservice.

## 1.5.2

- Implemented functionality to check if Docker is installed and prompt the user to install it if necessary.
- Enhanced error handling and logging for Docker container management.
- Improved progress reporting for long-running Docker commands.

## 1.4.8

- Fixed a bug causing incorrect status reporting for Docker containers.
- Improved performance of Docker container state checks.
- Enhanced logging for better traceability of Docker operations.

## 1.4.5

- Added support for custom Docker networks.
- Improved UI for selecting Docker containers to manage.
- Fixed issues with environment variable detection during container operations.

## 1.4.2

- Fixed a bug causing extension crash on certain Linux distributions.
- Enhanced error messages for Docker operation failures.
- Improved handling of Docker container dependencies.

## 1.4.0

- Added feature to monitor Docker container logs in real-time.
- Enhanced error handling for Docker operations.
- Improved performance of Docker commands execution.

## 1.3.9

- Fixed a bug with Docker container name collisions.
- Improved UI for better clarity during Docker operations.
- Enhanced progress reporting for long-running commands.

## 1.3.7

- Enhanced logging for better debugging of Docker operations.
- Improved performance of Docker container management.

## 1.3.5

- Fixed a bug causing Docker containers to not operate correctly.
- Improved error messages for better troubleshooting.
- Enhanced UI for managing Docker containers.

## 1.3.2

- Added support for multi-stage Docker builds.
- Improved user interface for Docker container status updates.
- Fixed issues with Docker container network settings.

## 1.2.2

- Fixed a bug causing the extension to crash on Windows when checking Docker daemon status.
- Improved error messages for better troubleshooting.

## 1.2.1

- Minor performance improvements for Docker container operations.
- Fixed an issue with Docker image detection logic.

## 1.2.0

- Added feature to deploy Docker containers.
- Improved user interface for deployment status.
- Enhanced error messages for deployment failures.
- Fixed issues with microservices directory detection.

## 1.1.3

- Fixed a bug that prevented microservices from operating correctly on macOS.
- Improved logging for deployment process.

## 1.1.2

- Minor UI enhancements for better user experience.
- Fixed an issue with progress reporting during updates.

## 1.1.1

- Improved handling of Docker daemon startup.
- Fixed bugs related to environment variable detection.

## 1.0.5

- Improved Docker container logic.
- Enhanced error messages for better clarity.

## 1.0.4

- Fixed a bug causing incorrect Docker container status detection.
- Improved performance of Docker container operations.

## 1.0.3

- Enhanced error handling for Docker operations.
- Improved progress reporting during Docker commands execution.

## 1.0.2

- Fixed a bug with Docker container creation on Linux.
- Improved logging for better debugging.

## 1.0.1

- Minor bug fixes and performance improvements.
- Enhanced UI for Docker container management.

## 1.0.0

- Initial release with features for creating, focusing, deploying, and managing microservices.
- UI enhancements for better user experience.
- Improved performance for creating microservices.

## 0.0.5

- Fixed a bug with Docker image naming conventions.
- Improved Docker container creation performance.

## 0.0.4

- Enhanced error messages for Docker operations.
- Improved UI for better clarity.

## 0.0.3

- Fixed a bug causing Docker containers to not operate properly on certain configurations.
- Improved logging for Docker operations.

## 0.0.2

- Improved performance for creating microservices.

## 0.0.1

- Initial release with basic features for microservices management.
