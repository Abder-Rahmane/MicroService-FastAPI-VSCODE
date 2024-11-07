import * as vscode from 'vscode';
import Docker from 'dockerode';
import * as path from 'path';
import { createMicroserviceCommand } from './commands/createMicroservice';
import { focusMicroserviceCommand } from './commands/focusMicroservice';
import { exec } from 'child_process';
import { showDockerLogs } from './commands/ShowDockerLogs';

import {
    MicroserviceProvider,
    ProjectItem as DockerProjectItem,
    MicroserviceItem as DockerMicroserviceItem,
    DockerComposeItem,
    FileItem,
} from './commands/DockerMicroserviceView';

import {
    LocalMicroserviceProvider,
    LocalProjectItem,
    LocalMicroserviceItem,
} from './commands/LocalMicroserviceView';

const docker = new Docker();
let isRestarting = false;

type ProjectItem = DockerProjectItem | LocalProjectItem;
type MicroserviceItem = DockerMicroserviceItem | LocalMicroserviceItem;

export function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '')
        .replace(/^-+|-+$/g, '');
}

function updateTreeViewTitle(mode: string) {
    const title = mode === 'local' ? 'Views Local' : 'Docker View';
}

export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('focusMicroservice');

    const initialMode = config.get('viewMode', 'local');
    let currentMode = initialMode;

    let currentProvider: MicroserviceProvider | LocalMicroserviceProvider = initialMode === 'local'
        ? new LocalMicroserviceProvider(vscode.workspace.rootPath || '')
        : new MicroserviceProvider(vscode.workspace.rootPath || '');


    vscode.window.registerTreeDataProvider('microserviceExplorer', currentProvider);
    updateTreeViewTitle(currentMode);

    vscode.commands.executeCommand('setContext', 'focusMicroservice.isDockerMode', currentMode === 'docker');

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.switchViewMode', async () => {
            if (currentMode === 'local') {
                if (currentProvider instanceof LocalMicroserviceProvider) {
                    const projects = currentProvider.getProjects();
                    for (const project of projects) {
                        await stopAllLocalMicroservices(project, currentProvider, true);
                    }
                }
            } else if (currentMode === 'docker') {
                if (currentProvider instanceof MicroserviceProvider) {
                    const projects = currentProvider.getProjects();
                    for (const project of projects) {
                        await stopAllMicroservices(project, currentProvider, true);
                    }
                }
            }
    
            currentMode = currentMode === 'local' ? 'docker' : 'local';
            await config.update('viewMode', currentMode, vscode.ConfigurationTarget.Global);
    
            currentProvider = currentMode === 'local'
                ? new LocalMicroserviceProvider(vscode.workspace.rootPath || '')
                : new MicroserviceProvider(vscode.workspace.rootPath || '');
    
            await vscode.commands.executeCommand('setContext', 'focusMicroservice.isDockerMode', currentMode === 'docker');
    
            vscode.window.registerTreeDataProvider('microserviceExplorer', currentProvider);
    
            updateTreeViewTitle(currentMode);
    
            vscode.window.showInformationMessage(`Switched to ${currentMode} view mode`);
        })
    );


    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('focusMicroservice.viewMode')) {
                const mode = config.get('viewMode', 'local');

                currentProvider = mode === 'local'
                    ? new LocalMicroserviceProvider(vscode.workspace.rootPath || '')
                    : new MicroserviceProvider(vscode.workspace.rootPath || '');

                vscode.window.registerTreeDataProvider('microserviceExplorer', currentProvider);
                updateTreeViewTitle(mode);
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.showDockerLogs', async (project?: ProjectItem) => {
            const projectPath = project ? path.basename(project.projectPath) : undefined;
            await showDockerLogs(projectPath);
        }),
        vscode.commands.registerCommand('extension.openDockerWebsite', async () => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }
            vscode.env.openExternal(vscode.Uri.parse('https://www.docker.com/get-started'));
        }),
        vscode.commands.registerCommand('extension.focusMicroservice', async (project: ProjectItem) => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }
            await focusMicroserviceCommand();
        }),
        vscode.commands.registerCommand('extension.startAllMicroservices', async (project: ProjectItem) => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }
            if (currentProvider instanceof MicroserviceProvider) {
                await startAllMicroservices(project, currentProvider);
            } else if (currentProvider instanceof LocalMicroserviceProvider) {
                await startAllLocalMicroservices(project as LocalProjectItem, currentProvider);
            }
        }),
        vscode.commands.registerCommand('extension.createMicroservice', async () => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }
            await createMicroserviceCommand(currentProvider as MicroserviceProvider);
        }),
        vscode.commands.registerCommand('extension.restartMicroservice', async (project: ProjectItem) => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }
            if (currentProvider instanceof MicroserviceProvider) {
                await restartAllMicroservices(project, currentProvider);
            } else if (currentProvider instanceof LocalMicroserviceProvider) {
                await restartAllLocalMicroservices(project as LocalProjectItem, currentProvider);
            }
        }),
        vscode.commands.registerCommand('extension.startMicroservice', async (...args: any[]) => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }

            if (currentProvider instanceof LocalMicroserviceProvider) {
                const [label, servicePath, projectPath] = args;
                vscode.window.showInformationMessage(`Starting microservice: ${label}`);

                const projectItem = new LocalProjectItem('Project', projectPath, currentProvider);
                const item = new LocalMicroserviceItem(label, servicePath, projectItem, 'stopped', currentProvider);
                await item.startService();
            } else if (currentProvider instanceof MicroserviceProvider) {
                const item = args[0] as DockerMicroserviceItem;
                vscode.window.showInformationMessage(`Starting microservice: ${item.label}`);
                await startMicroservice(item);
            }
        }),
        vscode.commands.registerCommand('extension.stopAllMicroservices', async (project: ProjectItem) => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }
            if (currentProvider instanceof MicroserviceProvider) {
                await stopAllMicroservices(project, currentProvider);
            } else if (currentProvider instanceof LocalMicroserviceProvider) {
                await stopAllLocalMicroservices(project as LocalProjectItem, currentProvider);
            }
        }),
        vscode.commands.registerCommand('extension.stopMicroservice', async (...args: any[]) => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being stopped. Please wait until it completes.');
                return;
            }

            if (currentProvider instanceof LocalMicroserviceProvider) {
                const [label, servicePath, projectPath] = args;
                vscode.window.showInformationMessage(`Stopping microservice: ${label}`);

                const projectItem = new LocalProjectItem('Project', projectPath, currentProvider);
                const item = new LocalMicroserviceItem(label, servicePath, projectItem, 'stopped', currentProvider);
                await item.stopService();
            } else if (currentProvider instanceof MicroserviceProvider) {
                const item = args[0] as DockerMicroserviceItem;
                vscode.window.showInformationMessage(`Stopping microservice: ${item.label}`);
                await stopMicroservice(item);
            }
        }),
        vscode.commands.registerCommand('extension.deployMicroservice', async (project: ProjectItem, item: MicroserviceItem) => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }
            if (!project || !item) {
                vscode.window.showErrorMessage('Project or Microservice is not defined.');
                return;
            }

            vscode.window.showInformationMessage(`Deploying microservice: ${item.label}`);
            await deployMicroservice(item);
        }),
        vscode.commands.registerCommand('extension.openDockerCompose', (item: DockerComposeItem) => {
            if (isRestarting) {
                vscode.window.showWarningMessage('A microservice is currently being restarted. Please wait until it completes.');
                return;
            }
            vscode.workspace.openTextDocument(item.dockerComposePath).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        })
    );

    async function startAllLocalMicroservices(project: LocalProjectItem, provider: LocalMicroserviceProvider) {
        const microservices = await provider.getMicroservices(project);
        for (const microservice of microservices) {
            await microservice.startService();
        }
        vscode.window.showInformationMessage(`Started all microservices in project ${project.label}.`);
    }
    
    async function stopAllLocalMicroservices(
        project: LocalProjectItem, 
        provider: LocalMicroserviceProvider, 
        suppressMessages: boolean = false
    ) {
        const microservices = await provider.getMicroservices(project);
        let stoppedCount = 0;
        let alreadyStoppedCount = 0;
        let failedCount = 0;
    
        for (const microservice of microservices) {
            const stopResult = await microservice.stopService();
            switch (stopResult) {
                case 'stopped':
                    stoppedCount++;
                    break;
                case 'alreadyStopped':
                    alreadyStoppedCount++;
                    break;
                case 'failed':
                    failedCount++;
                    console.error(`Failed to stop microservice ${microservice.label}`);
                    break;
            }
        }
    
        if (!suppressMessages) {
            if (stoppedCount > 0) {
                vscode.window.showInformationMessage(`Stopped ${stoppedCount} microservice(s) successfully.`);
            }
            if (alreadyStoppedCount > 0) {
                vscode.window.showInformationMessage(`${alreadyStoppedCount} microservice(s) were already stopped.`);
            }
            if (failedCount > 0) {
                vscode.window.showErrorMessage(`Failed to stop ${failedCount} microservice(s).`);
            }
        }
    }
    
    async function restartAllLocalMicroservices(project: LocalProjectItem, provider: LocalMicroserviceProvider) {
        const microservices = await provider.getMicroservices(project);
        for (const microservice of microservices) {
            await microservice.stopService();
            await microservice.startService();
        }
        vscode.window.showInformationMessage(`Restarted all microservices in project ${project.label}.`);
    }

    vscode.workspace.onDidChangeWorkspaceFolders(() => currentProvider.refresh());
    vscode.workspace.createFileSystemWatcher('**/microservices/*').onDidChange(() => currentProvider.refresh());
    vscode.workspace.createFileSystemWatcher('**/microservices/*').onDidCreate(() => currentProvider.refresh());
    vscode.workspace.createFileSystemWatcher('**/microservices/*').onDidDelete(() => currentProvider.refresh());
}

async function selectProject(treeDataProvider: MicroserviceProvider): Promise<ProjectItem | undefined> {
    const projects = await treeDataProvider.getProjects();
    const projectNames = projects.map(project => project.label);
    const selectedProjectName = await vscode.window.showQuickPick(projectNames, { placeHolder: 'Select a project' });
    return projects.find(project => project.label === selectedProjectName);
}

async function stopAllMicroservices(
    project: ProjectItem, 
    treeDataProvider: MicroserviceProvider, 
    suppressMessages: boolean = false
) {
    const microservices = await treeDataProvider.getMicroservices(project);
    let stoppedCount = 0;
    let alreadyStoppedCount = 0;
    let failedCount = 0;

    for (const microservice of microservices) {
        const stopResult = await stopMicroservice(microservice);
        switch (stopResult) {
            case 'stopped':
                stoppedCount++;
                break;
            case 'alreadyStopped':
                alreadyStoppedCount++;
                break;
            case 'failed':
                failedCount++;
                console.error(`Failed to stop microservice ${microservice.label}`);
                break;
        }
    }

    if (!suppressMessages) {
        if (stoppedCount > 0) {
            vscode.window.showInformationMessage(`Stopped ${stoppedCount} microservice(s) successfully.`);
        }
        if (alreadyStoppedCount > 0) {
            vscode.window.showInformationMessage(`${alreadyStoppedCount} microservice(s) were already stopped.`);
        }
        if (failedCount > 0) {
            vscode.window.showErrorMessage(`Failed to stop ${failedCount} microservice(s).`);
        }
    }
}


async function stopMicroservice(item: MicroserviceItem): Promise<string> {
    try {
        const normalizedServiceName = `microservice-${normalizeName(item.label)}`;
        const containers = await docker.listContainers({ all: true });
        const container = containers.find(container => container.Names.some(name => name.includes(normalizedServiceName)));

        if (!container) {
            console.log(`Microservice ${item.label} is already stopped.`);
            return 'alreadyStopped';
        }

        const containerInstance = docker.getContainer(container.Id);
        if (container.State === 'exited' || container.State === 'created') {
            console.log(`Microservice ${item.label} is already stopped.`);
            return 'alreadyStopped';
        }

        await containerInstance.stop();
        item.description = 'stopped';
        item.updateIconAndCommand('stopped');
        console.log(`Microservice ${item.label} stopped successfully.`);
        return 'stopped';
    } catch (error) {
        console.error(`Failed to stop microservice ${item.label}:`, error);
        return 'failed';
    }
}

let openedPorts: Set<number> = new Set();

async function waitForServerReady(port: number, timeout = 10000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const response = await fetch(`http://localhost:${port}/docs`);
            if (response.ok) {
                return;
            }
        } catch (error) {
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Server not ready in time');
}

async function startMicroservice(item: MicroserviceItem): Promise<string> {
    try {
        const normalizedServiceName = `microservice-${normalizeName(item.label)}`;
        const containers = await docker.listContainers({ all: true });
        const container = containers.find(container => container.Names.some(name => name.includes(normalizedServiceName)));

        if (!container) {
            console.log(`Deploying microservice ${item.label}...`);
            await deployMicroservice(item);
            return 'deployed';
        }

        const containerInstance = docker.getContainer(container.Id);

        if (container.State === 'running') {
            console.log(`Microservice ${item.label} is already running.`);
            const port = container.Ports.find(port => port.PublicPort)?.PublicPort;
            if (port && !openedPorts.has(port)) {
                console.log(`Waiting for server to be ready on port ${port}...`);
                await waitForServerReady(port);
                console.log(`Server is ready. Opening browser to http://localhost:${port}/docs`);
                vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/docs`));
                openedPorts.add(port);
            }
            return 'alreadyRunning';
        }

        await containerInstance.start();
        item.description = 'running...';
        item.updateIconAndCommand('running...');
        console.log(`Microservice ${item.label} started successfully.`);

        const updatedContainer = await docker.getContainer(container.Id).inspect();
        const port = Object.values(updatedContainer.NetworkSettings.Ports)
            .flat()
            .find(binding => binding?.HostPort)?.HostPort;

        if (port && !openedPorts.has(parseInt(port))) {
            console.log(`Waiting for server to be ready on port ${port}...`);
            await waitForServerReady(parseInt(port));
            console.log(`Server is ready. Opening browser to http://localhost:${port}/docs`);
            vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/docs`));
            openedPorts.add(parseInt(port));
        }

        return 'started';
    } catch (error) {
        console.error(`Failed to start microservice ${item.label}:`, error);
        vscode.window.showErrorMessage(`Failed to start microservice ${item.label}. Check the logs to debug the issue.`);
        await vscode.commands.executeCommand('extension.showDockerLogs', item.project);
        return 'failed';
    }
}

async function startAllMicroservices(project: ProjectItem, treeDataProvider: MicroserviceProvider) {
    const microservices = await treeDataProvider.getMicroservices(project);
    let startedCount = 0;
    let alreadyRunningCount = 0;
    let deployedCount = 0;
    let failedCount = 0;

    for (const microservice of microservices) {
        const result = await startMicroservice(microservice);
        switch (result) {
            case 'started':
                startedCount++;
                break;
            case 'alreadyRunning':
                alreadyRunningCount++;
                break;
            case 'deployed':
                deployedCount++;
                break;
            case 'failed':
                failedCount++;
                break;
        }
    }

    if (startedCount > 0) {
        vscode.window.showInformationMessage(`Started ${startedCount} microservice(s) successfully.`);
    }
    if (alreadyRunningCount > 0) {
        vscode.window.showInformationMessage(`${alreadyRunningCount} microservice(s) were already running.`);
    }
    if (deployedCount > 0) {
        vscode.window.showInformationMessage(`Deployed and started ${deployedCount} microservice(s) successfully.`);
    }
    if (failedCount > 0) {
        vscode.window.showErrorMessage(`Failed to start ${failedCount} microservice(s). Check the logs to debug the issue.`);
    }
}

async function rebuildDockerImage(item: MicroserviceItem): Promise<string> {
    try {
        const normalizedServiceName = `microservice-${normalizeName(item.label)}`;
        const projectPath = item.project?.projectPath;
        if (!projectPath) {
            throw new Error("Project path is undefined.");
        }

        const dockerComposePath = path.join(projectPath, 'deployment', 'docker-compose.yml');
        await execPromise(`docker-compose -f ${dockerComposePath} build ${normalizedServiceName}`);

        console.log(`Rebuilt image for microservice ${item.label} successfully.`);
        return 'rebuilt';
    } catch (error) {
        console.error(`Failed to rebuild image for microservice ${item.label}:`, error);
        return 'failed';
    }
}

async function restartMicroservice(item: MicroserviceItem): Promise<string> {
    if (isRestarting) {
        vscode.window.showWarningMessage('A microservice is already being restarted. Please wait until it completes.');
        return 'busy';
    }

    isRestarting = true;
    try {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Restarting microservice: ${item.label}`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 20, message: 'Stopping container...' });
            const normalizedServiceName = `microservice-${normalizeName(item.label)}`;
            const containers = await docker.listContainers({ all: true });
            const container = containers.find(container => container.Names.some(name => name.includes(normalizedServiceName)));

            if (!container) {
                vscode.window.showInformationMessage(`Container for microservice ${item.label} not found. Deploying microservice.`);
                await deployMicroservice(item);
                isRestarting = false;
                return 'deployed';
            }

            const containerInstance = docker.getContainer(container.Id);

            if (container.State === 'running') {
                await containerInstance.stop();
            }

            progress.report({ increment: 40, message: 'Rebuilding Docker image...' });
            const rebuildResult = await rebuildDockerImage(item);
            if (rebuildResult === 'failed') {
                vscode.window.showErrorMessage(`Failed to rebuild image for microservice ${item.label}`);
                isRestarting = false;
                return 'failed';
            }

            if (container.State !== 'created') {
                progress.report({ increment: 60, message: 'Removing old container...' });
                await containerInstance.remove();
            }

            progress.report({ increment: 80, message: 'Starting container with new image...' });
            await execPromise(`docker-compose -f ${path.join(item.project?.projectPath || '', 'deployment', 'docker-compose.yml')} up -d ${normalizedServiceName}`);

            const updatedContainers = await docker.listContainers({ all: true });
            const updatedContainer = updatedContainers.find(container => container.Names.some(name => name.includes(normalizedServiceName)));

            if (updatedContainer && updatedContainer.State === 'running') {
                const ports = updatedContainer.Ports;
                const port = ports.find(port => port.PublicPort)?.PublicPort;

                if (port && !openedPorts.has(port)) {
                    console.log(`Waiting for server to be ready on port ${port}...`);
                    await waitForServerReady(port);
                    console.log(`Server is ready. Opening browser to http://localhost:${port}/docs`);
                    vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/docs`));
                    openedPorts.add(port);
                }
            } else {
                vscode.window.showErrorMessage(`Microservice ${item.label} failed to start. Check the logs to debug the issue and restart project.`);
                await vscode.commands.executeCommand('extension.showDockerLogs', item.project);
                isRestarting = false;
                return 'failed';
            }

            item.description = 'running...';
            item.updateIconAndCommand('running...');
            progress.report({ increment: 100, message: 'Microservice restarted successfully.' });
            vscode.window.showInformationMessage(`Microservice ${item.label} restarted successfully.`);
            isRestarting = false;
            return 'restarted';
        });

    } catch (error) {
        console.error(`Failed to restart microservice ${item.label}:`, error);
        vscode.window.showErrorMessage(`Failed to restart microservice ${item.label}. Check the logs to debug the issue and restart project.`);
        await vscode.commands.executeCommand('extension.showDockerLogs', item.project);
        isRestarting = false;
        return 'failed';
    }
}

async function restartAllMicroservices(project: ProjectItem, treeDataProvider: MicroserviceProvider) {
    const microservices = await treeDataProvider.getMicroservices(project);
    let restartedCount = 0;
    let failedRestartCount = 0;

    for (const microservice of microservices) {
        try {
            const restartResult = await restartMicroservice(microservice);
            if (restartResult === 'restarted' || restartResult === 'deployed') {
                restartedCount++;
            } else {
                failedRestartCount++;
                console.error(`Failed to restart microservice ${microservice.label}`);
            }
        } catch (error) {
            console.error(`Failed to restart microservice ${microservice.label}:`, error);
            failedRestartCount++;
        }
    }

    if (restartedCount > 0) {
        vscode.window.showInformationMessage(`Restarted ${restartedCount} microservice(s) successfully.`);
    }
    if (failedRestartCount > 0) {
        vscode.window.showErrorMessage(`Failed to restart ${failedRestartCount} microservice(s). Check the logs to debug the issue and restart project.`);
    }
}

async function deployMicroservice(item: MicroserviceItem) {
    if (!item.project || !item.label) {
        vscode.window.showErrorMessage('Project or Microservice label is not defined.');
        return;
    }

    const projectPath = item.project.projectPath;
    const dockerComposePath = path.join(projectPath, 'deployment', 'docker-compose.yml');
    const serviceName = `microservice-${normalizeName(item.label)}`;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Deploying microservice: ${item.label}`,
            cancellable: false
        }, async (progress) => {
            let progressValue = 0;
            const interval = setInterval(() => {
                progressValue += 10;
                progress.report({ increment: 10, message: `Deploying in progress... ${progressValue}%` });
                if (progressValue >= 100) {
                    clearInterval(interval);
                }
            }, 2000);

            const { stdout, stderr } = await execPromise(`docker-compose -f ${dockerComposePath} up -d ${serviceName}`);

            clearInterval(interval);

            const nonCriticalMessages = [
                'Creating',
                'Created',
                'Starting',
                'Started',
                'Found orphan containers'
            ];

            const criticalErrors = stderr.split('\n').filter(line =>
                !nonCriticalMessages.some(nonCriticalMessage => line.includes(nonCriticalMessage))
            ).join('\n');

            if (criticalErrors.trim().length > 0) {
                vscode.window.showErrorMessage(`Docker Compose reported warnings or errors: ${criticalErrors}`);
            } else {
                vscode.window.showInformationMessage(`Microservice ${item.label} deployed successfully.`);

                const containers = await docker.listContainers({ all: true });
                const container = containers.find(container => container.Names.some(name => name.includes(serviceName)));

                if (container) {
                    const updatedContainer = await docker.getContainer(container.Id).inspect();
                    const ports = updatedContainer.NetworkSettings.Ports;
                    const port = ports && Object.values(ports)
                        .flat()
                        .find(binding => binding?.HostPort)?.HostPort;

                    if (port && !openedPorts.has(parseInt(port))) {
                        console.log(`Waiting for server to be ready on port ${port}...`);
                        await waitForServerReady(parseInt(port));
                        console.log(`Server is ready. Opening browser to http://localhost:${port}/docs`);
                        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/docs`));
                        openedPorts.add(parseInt(port));
                    } else if (!port) {
                        console.error(`No public port found for microservice ${item.label} after starting`);
                    }
                } else {
                    console.error(`Container for microservice ${item.label} not found`);
                }
            }

            item.description = 'running...';
            item.updateIconAndCommand('running...');
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to deploy microservice: ${error}`);
    }
}

function execPromise(command: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}
