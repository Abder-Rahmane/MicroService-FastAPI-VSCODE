import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { createFullMicroserviceStructure, normalizeName } from '../../utils/createMicroserviceStructure';

const execPromise = promisify(exec);

async function isDockerInstalled(): Promise<boolean> {
    try {
        await execPromise('docker --version');
        return true;
    } catch {
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
                resolve();
            } catch (error) {
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
    try {
        await execPromise('docker info');
        return true;
    } catch {
        return false;
    }
}

async function waitForService(url: string, timeout: number = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            await execPromise(`curl -sSf ${url}`);
            return;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error(`Service at ${url} did not become available within ${timeout / 1000} seconds`);
}

async function openMicroservicesInBrowser(deploymentPath: string) {
    console.log('Opening microservices in browser...');

    const dockerComposePath = path.join(deploymentPath, 'docker-compose.yml');
    if (!fs.existsSync(dockerComposePath)) {
        vscode.window.showErrorMessage('docker-compose.yml not found in deployment folder');
        return;
    }

    const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf-8');
    const portRegex = /- "(\d+):8000"/g;
    let match;
    const serviceUrls = [];

    while ((match = portRegex.exec(dockerComposeContent)) !== null) {
        const port = match[1];
        serviceUrls.push(`http://localhost:${port}/docs`);
    }

    try {
        for (const url of serviceUrls) {
            await waitForService(url, 30000);
            console.log(`Attempting to open service URL: ${url}`);
            const success = await vscode.env.openExternal(vscode.Uri.parse(url));
            if (success) {
                console.log(`Successfully opened URL: ${url}`);
            } else {
                console.error(`Failed to open URL: ${url}`);
                vscode.window.showErrorMessage(`Failed to open URL: ${url}`);
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to wait for services to become available: ${errorMessage}`);
        console.error(`Error: ${errorMessage}`, error);
    }
}

async function areDockerImagesBuilt(projectPath: string): Promise<boolean> {
    try {
        const serviceNames = fs.readdirSync(path.join(projectPath, 'microservices')).filter(name => {
            return !name.startsWith('.') && fs.lstatSync(path.join(projectPath, 'microservices', name)).isDirectory();
        });

        for (const serviceName of serviceNames) {
            const imageName = `deployment-microservice-${serviceName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const { stdout } = await execPromise(`docker images -q ${imageName}`);
            if (stdout.trim().length === 0) {
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Error checking Docker images:', error);
        return false;
    }
}

async function deployDockerContainers(deploymentPath: string): Promise<void> {
    console.log('Deploying Docker containers...');
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Deploying Docker containers...',
        cancellable: false
    }, async (progress) => {
        return new Promise<void>((resolve, reject) => {
            const dockerProcess = spawn('docker-compose', ['up', '--build', '-d'], { cwd: deploymentPath });

            if (dockerProcess.stdout) {
                dockerProcess.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });
            }

            if (dockerProcess.stderr) {
                dockerProcess.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                });
            }

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
}

async function startDockerContainers(deploymentPath: string): Promise<void> {
    console.log('Starting Docker containers...');
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Starting Docker containers...',
        cancellable: false
    }, async (progress) => {
        return new Promise<void>((resolve, reject) => {
            const dockerProcess = spawn('docker-compose', ['up', '-d'], { cwd: deploymentPath });

            if (dockerProcess.stdout) {
                dockerProcess.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });
            }

            if (dockerProcess.stderr) {
                dockerProcess.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                });
            }

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

    vscode.window.showInformationMessage('Docker containers started successfully!');
}

export async function startMicroserviceServer(projectPath: string) {
    try {
        console.log('Start Microservice Server command executed');


        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No folder or workspace opened');
            console.log('No folder or workspace opened');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const projects = fs.readdirSync(rootPath).filter(name => fs.lstatSync(path.join(rootPath, name)).isDirectory() && name !== 'deployment');

        if (projects.length === 0) {
            vscode.window.showErrorMessage('No projects found. Please create a project first.');
            return;
        }

        let project = await vscode.window.showQuickPick(projects, { placeHolder: 'Select a project to deploy' });

        if (!project) {
            return;
        }

        project = normalizeName(project);
        const projectPath = path.join(rootPath, project);
        const deploymentPath = path.join(projectPath, 'deployment');

        const microservicesPath = path.join(projectPath, 'microservices');
        if (!fs.existsSync(microservicesPath) || fs.readdirSync(microservicesPath).filter(name => !name.startsWith('.') && fs.lstatSync(path.join(microservicesPath, name)).isDirectory()).length === 0) {
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
                    await createFullMicroserviceStructure(projectPath, microserviceName);
                    return;
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
            vscode.window.showInformationMessage('Starting Docker daemon...');
            await startDockerDaemon();
            
            await new Promise(resolve => setTimeout(resolve, 10000));

            if (!(await isDockerDaemonRunning())) {
                vscode.window.showErrorMessage('Failed to start Docker daemon. Please start Docker manually and try again.');
                return;
            }
        }

        const imagesBuilt = await areDockerImagesBuilt(projectPath);
        if (imagesBuilt) {
            vscode.window.showInformationMessage('Your microservices are already deployed on Docker.');
            await openMicroservicesInBrowser(deploymentPath);
            return;
        }

        await deployDockerContainers(deploymentPath);
        await startDockerContainers(deploymentPath);
        await openMicroservicesInBrowser(deploymentPath);

    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to start microservice server: ${error.message}`);
            console.error(`Error: ${error.message}`, error);
        } else {
            vscode.window.showErrorMessage('Failed to start microservice server: Unknown error');
            console.error('Unknown error', error);
        }
    }
}