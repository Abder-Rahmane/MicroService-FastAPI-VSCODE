import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { createFullMicroserviceStructure } from '../../utils/createMicroserviceStructure';

const execPromise = promisify(exec);

async function isDockerInstalled(): Promise<boolean> {
    console.log('Checking if Docker is installed...');
    try {
        await execPromise('docker --version');
        console.log('Docker is installed.');
        return true;
    } catch (error) {
        console.error('Docker is not installed:', error);
        return false;
    }
}

async function installDocker(): Promise<void> {
    const platform = process.platform;
    const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: 'Installing Docker...',
        cancellable: false
    };

    await vscode.window.withProgress(progressOptions, async (progress) => {
        return new Promise<void>(async (resolve, reject) => {
            try {
                if (platform === 'win32') {
                    const tempPath = path.join(process.env.TEMP || '/tmp', 'DockerDesktopInstaller.exe');
                    await execPromise(`powershell -Command "Invoke-WebRequest -UseBasicParsing https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe -OutFile ${tempPath}; Start-Process -FilePath ${tempPath} -Wait -NoNewWindow; Remove-Item ${tempPath}"`);
                } else if (platform === 'darwin') {
                    await execPromise('brew install --cask docker');
                } else if (platform === 'linux') {
                    await execPromise('sudo apt-get update && sudo apt-get install -y docker.io');
                }
                vscode.window.showInformationMessage('Docker installed successfully.');
                resolve();
            } catch (error) {
                vscode.window.showErrorMessage('Failed to install Docker. Please install Docker manually.');
                reject(error);
            }
        });
    });
}

async function startDockerDaemon(): Promise<void> {
    const platform = process.platform;
    if (platform === 'win32') {
        await execPromise('powershell -Command "Start-Process \\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\\""');
    } else if (platform === 'darwin') {
        await execPromise('open /Applications/Docker.app');
    } else if (platform === 'linux') {
        await execPromise('sudo systemctl start docker');
    }
}

async function isDockerDaemonRunning(): Promise<boolean> {
    console.log('Checking if Docker daemon is running...');
    try {
        await execPromise('docker info');
        console.log('Docker daemon is running.');
        return true;
    } catch (error) {
        console.error('Docker daemon is not running:', error);
        return false;
    }
}

async function waitForService(url: string, timeout: number = 30000): Promise<void> {
    console.log(`Waiting for service at ${url}...`);
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            await execPromise(`curl -sSf ${url}`);
            console.log(`Service at ${url} is available.`);
            return;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error(`Service at ${url} did not become available within ${timeout / 1000} seconds`);
}

async function areDockerContainersRunning(serviceNames: string[]): Promise<boolean[]> {
    console.log('Checking if Docker containers are running...');
    const result = await Promise.all(serviceNames.map(async (serviceName) => {
        try {
            const { stdout } = await execPromise(`docker ps --filter "name=${serviceName}" -q`);
            const isRunning = stdout.trim().length > 0;
            console.log(`Docker container for ${serviceName} running: ${isRunning}`);
            return isRunning;
        } catch (error) {
            console.error(`Error checking Docker container for ${serviceName}:`, error);
            return false;
        }
    }));
    return result;
}

async function createMicroservice(name: string): Promise<void> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No folder or workspace opened');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;

        await createFullMicroserviceStructure(rootPath, name);
        vscode.window.showInformationMessage(`Microservice "${name}" created successfully!`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create microservice: ${error}`);
        console.error('Error creating microservice:', error);
    }
}

async function areDockerImagesBuilt(rootPath: string): Promise<boolean> {
    console.log('Checking if Docker images are built...');
    try {
        const serviceNames = fs.readdirSync(path.join(rootPath, 'microservices')).filter(name => {
            return !name.startsWith('.') && fs.lstatSync(path.join(rootPath, 'microservices', name)).isDirectory();
        });

        for (const serviceName of serviceNames) {
            const imageName = `deployment-microservice-${serviceName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const { stdout } = await execPromise(`docker images -q ${imageName}`);
            if (stdout.trim().length === 0) {
                return false;
            }
        }
        console.log('Docker images are built.');
        return true;
    } catch (error) {
        console.error('Error checking Docker images:', error);
        return false;
    }
}

async function deployDockerContainers(rootPath: string, serviceNames: string[]) {
    console.log('Deploying Docker containers...');
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Deploying Docker containers...',
        cancellable: false
    }, async (progress) => {
        return new Promise<void>((resolve, reject) => {
            const dockerProcess = spawn('docker-compose', ['up', '--build', '-d'], { cwd: path.join(rootPath, 'deployment') });

            dockerProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            dockerProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            dockerProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('Docker containers deployed successfully.');
                    resolve();
                } else {
                    reject(new Error(`docker-compose process exited with code ${code}`));
                }
            });

            let progressValue = 0;
            const interval = setInterval(() => {
                progressValue += 10;
                progress.report({ increment: 10, message: `Deploying in progress... ${progressValue}%` });
                if (progressValue >= 100) {
                    clearInterval(interval);
                }
            }, 2000);
        });
    });

    vscode.window.showInformationMessage('Docker containers deployed successfully!');
    await openMicroservicesInBrowser(rootPath, serviceNames);
}

async function startDockerContainersHelper(rootPath: string, serviceNames: string[]) {
    console.log('Starting Docker containers...');
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Starting Docker containers...',
        cancellable: false
    }, async (progress) => {
        return new Promise<void>((resolve, reject) => {
            const dockerProcess = spawn('docker-compose', ['up', '-d'], { cwd: path.join(rootPath, 'deployment') });

            dockerProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            dockerProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            dockerProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('Docker containers started successfully.');
                    resolve();
                } else {
                    reject(new Error(`docker-compose process exited with code ${code}`));
                }
            });

            let progressValue = 0;
            const interval = setInterval(() => {
                progressValue += 10;
                progress.report({ increment: 10, message: `Starting in progress... ${progressValue}%` });
                if (progressValue >= 100) {
                    clearInterval(interval);
                }
            }, 2000);
        });
    });

    vscode.window.showInformationMessage('Docker containers started successfully !');
    await openMicroservicesInBrowser(rootPath, serviceNames);
}

async function openMicroservicesInBrowser(rootPath: string, serviceNames: string[]) {
    console.log('Opening microservices in browser...');
    const servicePorts = serviceNames.map((_, index) => 8001 + index);
    const urls = servicePorts.map(port => `http://localhost:${port}/docs`);

    try {
        for (const url of urls) {
            await waitForService(url);
            vscode.env.openExternal(vscode.Uri.parse(url));
            console.log(`Successfully opened URL: ${url}`);
        }
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to wait for services to become available: ${error.message}`);
            console.error(`Error: ${error.message}`, error);
        } else {
            vscode.window.showErrorMessage('Failed to wait for services to become available: Unknown error');
            console.error('Unknown error', error);
        }
    }
}

export async function startDockerContainers() {
    try {
        console.log('Start Docker Containers command executed');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No folder or workspace opened');
            console.log('No folder or workspace opened');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        console.log('Workspace root path:', rootPath);

        const microservicesDir = path.join(rootPath, 'microservices');
        let serviceNames: string[] = [];
        if (fs.existsSync(microservicesDir)) {
            serviceNames = fs.readdirSync(microservicesDir).filter(name => {
                return !name.startsWith('.') && fs.lstatSync(path.join(microservicesDir, name)).isDirectory();
            });
        }

        if (serviceNames.length === 0) {
            const createMicroservicePrompt = await vscode.window.showInformationMessage(
                'No microservices are currently present. Would you like to create a new microservice?',
                { modal: true },
                'Create Microservice'
            );
            if (createMicroservicePrompt === 'Create Microservice') {
                const microserviceName = await vscode.window.showInputBox({
                    placeHolder: 'Enter the name of the microservice'
                });

                if (microserviceName) {
                    await createMicroservice(microserviceName);
                    serviceNames = fs.readdirSync(microservicesDir).filter(name => {
                        return !name.startsWith('.') && fs.lstatSync(path.join(microservicesDir, name)).isDirectory();
                    });
                } else {
                    vscode.window.showErrorMessage('Microservice name is required to create a new microservice.');
                    return;
                }
            } else {
                return;
            }
        }

        const dockerInstalled = await isDockerInstalled();
        if (!dockerInstalled) {
            const installDockerPrompt = await vscode.window.showInformationMessage(
                'Docker is not installed. Would you like to install Docker?',
                { modal: true },
                'Install Docker'
            );
            if (installDockerPrompt === 'Install Docker') {
                await installDocker();
            } else {
                return;
            }
        }

        const dockerDaemonRunning = await isDockerDaemonRunning();
        if (!dockerDaemonRunning) {
            const startDaemonPrompt = await vscode.window.showInformationMessage(
                'Docker daemon is not running. Would you like to start the Docker daemon?',
                { modal: true },
                'Start Docker Daemon'
            );
            if (startDaemonPrompt === 'Start Docker Daemon') {
                await startDockerDaemon();
                await new Promise(resolve => setTimeout(resolve, 10000)); 
            } else {
                return;
            }

            if (!(await isDockerDaemonRunning())) {
                vscode.window.showErrorMessage('Failed to start Docker daemon. Please start Docker manually and try again.');
                return;
            }
        }

        const imagesBuilt = await areDockerImagesBuilt(rootPath);
        if (!imagesBuilt) {
            const deploy = await vscode.window.showInformationMessage(
                'No Docker images found. Would you like to deploy the containers?',
                { modal: true },
                'Deploy in Docker'
            );
            if (deploy === 'Deploy in Docker') {
                await deployDockerContainers(rootPath, serviceNames);
            } else {
                return;
            }
        }

        const containersRunning = await areDockerContainersRunning(serviceNames);
        const allContainersRunning = containersRunning.every(isRunning => isRunning);

        if (allContainersRunning) {
            vscode.window.showInformationMessage('Docker containers are already running.');
            await openMicroservicesInBrowser(rootPath, serviceNames);
        } else {
            await startDockerContainersHelper(rootPath, serviceNames);
        }
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to start Docker containers: ${error.message}`);
            console.error(`Error: ${error.message}`, error);
        } else {
            vscode.window.showErrorMessage('Failed to start Docker containers: Unknown error');
            console.error('Unknown error', error);
        }
    }
}
