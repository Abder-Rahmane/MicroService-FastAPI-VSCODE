import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import Docker from 'dockerode';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);
const docker = new Docker();

let currentlyExpandedProject: ProjectItem | null = null;

export class MicroserviceProvider implements vscode.TreeDataProvider<ProjectItem | MicroserviceItem | DockerComposeItem | FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | MicroserviceItem | DockerComposeItem | FileItem | undefined | void> = new vscode.EventEmitter<ProjectItem | MicroserviceItem | DockerComposeItem | FileItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | MicroserviceItem | DockerComposeItem | FileItem | undefined | void> = this._onDidChangeTreeData.event;

    private projectPath: string;
    private dockerCheckInterval: NodeJS.Timeout | undefined;
    private dockerDaemonRunning: boolean = false;
    private fileWatcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher('');


    dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        if (this.dockerCheckInterval) {
            clearInterval(this.dockerCheckInterval);
        }
    }

    constructor(projectPath: string) {
        this.projectPath = projectPath;
        this.initialize();
    }

    private async initialize() {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(path.join(this.projectPath, '**/*'));

        const projectWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.projectPath, '**/project-config.json'));

        projectWatcher.onDidDelete(() => {
            this.refresh();
        });

        const microserviceWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.projectPath, '**/microservices/*'));

        microserviceWatcher.onDidDelete(() => {
            this.refresh();
        });

        this.fileWatcher.onDidDelete((uri: vscode.Uri) => {
            this.handleDeletion(uri.fsPath);
        });

        this.dockerDaemonRunning = await isDockerDaemonRunning();
        if (this.dockerDaemonRunning) {
            this.startDockerEventListener();
            await this.updateProjectDescriptions();
            this.refresh();
        }

        this.startDockerCheckInterval();
    }

    private handleDeletion(filePath: string): void {
        const projectConfigPath = path.join(filePath, 'project-config.json');
        if (fs.existsSync(projectConfigPath)) {
            console.log(`Project deleted: ${filePath}`);
            this.removeProject(filePath);  
        }
    }

    removeProject(projectPath: string): void {
        const projects = this.getProjects();
        const index = projects.findIndex(project => project.projectPath === projectPath);
        if (index !== -1) {
            const project = projects[index];
            this.removeDockerContainersForProject(project);
            projects.splice(index, 1);
            console.log(`Project ${projectPath} removed from the list.`);
            this.refresh(); 
        }
    }

    private async removeDockerContainersForProject(project: ProjectItem) {
        const microservices = await this.getMicroservices(project);
        for (const microservice of microservices) {
            await stopAndRemoveDockerContainer(microservice);
        }
    }
    

    private startDockerCheckInterval() {
        this.dockerCheckInterval = setInterval(async () => {
            const dockerDaemonRunning = await isDockerDaemonRunning();
            if (dockerDaemonRunning !== this.dockerDaemonRunning) {
                this.dockerDaemonRunning = dockerDaemonRunning;
                if (dockerDaemonRunning) {
                    this.startDockerEventListener();
                } else {
                    console.error('Docker daemon stopped.');
                }
                await this.updateProjectDescriptions();
                this.refresh();
            }
        }, 10000); 
    }


   private startDockerEventListener() {
       docker.getEvents((err, stream) => {
           if (err) {
               console.error('Error connecting to Docker events:', err);
               return;
           }
           if (stream) {
               stream.on('data', async (chunk) => {
                   const event = JSON.parse(chunk.toString('utf8'));
                   if (['start', 'stop', 'die', 'destroy'].includes(event.status)) {
                       await this.updateProjectDescriptions();
                       this.refresh();
                   }
               });
           }
       });
   }

    refresh(): void {
        this.updateProjectDescriptions();
        this._onDidChangeTreeData.fire();
    }

    updateItem(item: ProjectItem | MicroserviceItem | DockerComposeItem | FileItem): void {
        this._onDidChangeTreeData.fire(item);
    }

    private async updateProjectDescriptions() {
        const projects = this.getProjects();
        for (const project of projects) {
            const { running, total } = await this.getRunningMicroservicesCount(project);
            project.description = `${running} / ${total} running`;
            this.updateItem(project);
        }
    }

    getTreeItem(element: ProjectItem | MicroserviceItem | DockerComposeItem | FileItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ProjectItem | MicroserviceItem | DockerComposeItem | FileItem): Promise<(ProjectItem | MicroserviceItem | DockerComposeItem | FileItem)[]> {
        if (element instanceof ProjectItem) {
            if (currentlyExpandedProject && currentlyExpandedProject !== element) {
                const previousProject = currentlyExpandedProject;
                currentlyExpandedProject = element;
                await this.recollapseProject(previousProject);
            } else {
                currentlyExpandedProject = element;
            }
            const children: (MicroserviceItem | DockerComposeItem)[] = [this.getDockerComposeItem(element), ...await this.getMicroservices(element)];
            return Promise.resolve(children);
        } else if (element instanceof MicroserviceItem) {
            return Promise.resolve([]);
        } else if (!element) {
            const projects = this.getProjects();
            if (projects.length === 0) {
                const messageItem = new MessageItem('No projects or microservices found. Click here to create one.', {
                    command: 'extension.createMicroservice',
                    title: 'Create Microservice'
                });
                return Promise.resolve([messageItem as any]);
            } else {
                return Promise.resolve(projects);
            }
        }
        return Promise.resolve([]);
    }

    createProjectItem(project: ProjectItem): ProjectItem {
        return new ProjectItem(project.label, project.projectPath, this);
    }

    async recollapseProject(project: ProjectItem): Promise<void> {
        const projectTreeItem = this.createProjectItem(project);
        this._onDidChangeTreeData.fire(projectTreeItem);
    }

    getProjects(): ProjectItem[] {
        if (fs.existsSync(this.projectPath)) {
            const projectDirectories = fs.readdirSync(this.projectPath).filter(name => {
                const projectDir = path.join(this.projectPath, name);
                return fs.lstatSync(projectDir).isDirectory() && fs.existsSync(path.join(projectDir, 'project-config.json'));
            });
            return projectDirectories.map(name => new ProjectItem(name, path.join(this.projectPath, name), this));
        } else {
            return [];
        }
    }

    async getMicroservices(project: ProjectItem): Promise<MicroserviceItem[]> {
        const microservicesPath = path.join(project.projectPath, 'microservices');
        if (fs.existsSync(microservicesPath)) {
            const microserviceDirectories = fs.readdirSync(microservicesPath).filter(name => fs.lstatSync(path.join(microservicesPath, name)).isDirectory());
            const microserviceItems = await Promise.all(microserviceDirectories.map(async name => {
                const servicePath = path.join(microservicesPath, name);
                const status = await this.getServerStatus(servicePath);
                return new MicroserviceItem(name, servicePath, project, status);
            }));
            return microserviceItems;
        } else {
            return [];
        }
    }

    getFiles(directoryPath: string): FileItem[] {
        if (fs.existsSync(directoryPath)) {
            const fileNames = fs.readdirSync(directoryPath);
            return fileNames.map(name => new FileItem(name, path.join(directoryPath, name), directoryPath));
        } else {
            return [];
        }
    }

    getDockerComposeItem(project: ProjectItem): DockerComposeItem {
        const dockerComposePath = path.join(project.projectPath, 'deployment', 'docker-compose.yml');
        return new DockerComposeItem(dockerComposePath, project);
    }

    async getServerStatus(servicePath: string): Promise<string> {
        const serviceName = path.basename(servicePath);
        try {
            const dockerInstalled = await isDockerInstalled();
            if (!dockerInstalled) {
                return 'need to install and/or start docker';
            }

            const dockerDaemonRunning = await isDockerDaemonRunning();
            if (!dockerDaemonRunning) {
                return 'need to install and/or start docker';
            }

            const containers = await docker.listContainers({ all: true });
            const container = containers.find((container: any) => container.Names.some((name: any) => name.includes(serviceName)));

            if (!container) {
                return 'not deployed (click to deploy)';
            } else if (container.State === 'running') {
                return 'running...';
            } else {
                return 'stopped';
            }
        } catch (error) {
            console.error('Error fetching Docker containers:', error);
            return 'Error';
        }
    }

    async getRunningMicroservicesCount(project: ProjectItem): Promise<{ running: number, total: number }> {
        const microservices = await this.getMicroservices(project);
        const running = microservices.filter(ms => ms.description === 'running...').length;
        return { running, total: microservices.length };
    }
}

async function stopAndRemoveDockerContainer(microserviceItem: MicroserviceItem) {
    const normalizedServiceName = `microservice-${normalizeName(microserviceItem.label)}`;
    const containers = await docker.listContainers({ all: true });
    const container = containers.find(container => container.Names.some(name => name.includes(normalizedServiceName)));

    if (container) {
        try {
            const containerInstance = docker.getContainer(container.Id);

            if (container.State === 'running') {
                await containerInstance.stop();
            }

            await containerInstance.remove();
            console.log(`Successfully stopped and removed Docker container for microservice: ${microserviceItem.label}`);
        } catch (error) {
            console.error(`Failed to stop/remove Docker container for microservice ${microserviceItem.label}:`, error);
        }
    }
}

function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '')
        .replace(/^-+|-+$/g, '');
}

async function isDockerInstalled(): Promise<boolean> {
    try {
        await execPromise('docker --version');
        return true;
    } catch {
        return false;
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

export class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly projectPath: string,
        microserviceProvider: MicroserviceProvider
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.tooltip = `Project: ${this.label}`;
        this.contextValue = 'project';
        this.iconPath = {
            light: path.join(__filename, '..', '..', 'images', 'project.svg'),
            dark: path.join(__filename, '..', '..', 'images', 'project.svg')
        };

        microserviceProvider.getRunningMicroservicesCount(this).then(({ running, total }) => {
            this.description = `${running} / ${total} running`;
            microserviceProvider.updateItem(this);
        });
    }
}

export class MicroserviceItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly servicePath: string,
        public readonly project: ProjectItem,
        serverStatus: string
    ) {
        super(`${label}: microservice`, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Microservice: ${this.label}`;
        this.contextValue = 'microservice';
        this.description = serverStatus;

        this.updateIconAndCommand(serverStatus);
    }

    public updateIconAndCommand(status: string): void {
        if (status === 'running...') {
            this.iconPath = {
                light: path.join(__filename, '..', '..', 'images', 'stop.svg'),
                dark: path.join(__filename, '..', '..', 'images', 'stop.svg')
            };
            this.command = {
                command: 'extension.stopMicroservice',
                title: 'Stop Microservice',
                arguments: [this],
                tooltip: 'Stop this microservice',
            };
        } else if (status === 'stopped') {
            this.iconPath = {
                light: path.join(__filename, '..', '..', 'images', 'play.svg'),
                dark: path.join(__filename, '..', '..', 'images', 'play.svg')
            };
            this.command = {
                command: 'extension.startMicroservice',
                title: 'Start Microservice',
                arguments: [this],
                tooltip: 'Start this microservice',
            };
        } else if (status === 'not deployed (click to deploy)') {
            this.iconPath = {
                light: path.join(__filename, '..', '..', 'images', 'loading.svg'),
                dark: path.join(__filename, '..', '..', 'images', 'loading.svg')
            };
            this.command = {
                command: 'extension.deployMicroservice',
                title: 'Deploy Microservice',
                arguments: [this.project, this],
                tooltip: 'Deploy this microservice',
            };
        } else if (status === 'need to install and/or start docker') {
            this.iconPath = {
                light: path.join(__filename, '..', '..', 'images', 'download.svg'),
                dark: path.join(__filename, '..', '..', 'images', 'download.svg')
            };
            this.command = {
                command: 'extension.openDockerWebsite',
                title: 'Install Docker',
                arguments: [],
                tooltip: 'Install Docker to manage this microservice',
            };
        }
    }
}

class MessageItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly command: vscode.Command
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'message';
    }
}

export class FileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filePath: string,
        public readonly parentPath: string
    ) {
        super(label, fs.lstatSync(filePath).isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.tooltip = `File: ${this.label}`;
        this.contextValue = 'file';
        this.iconPath = fs.lstatSync(filePath).isDirectory()
            ? vscode.ThemeIcon.Folder
            : vscode.ThemeIcon.File;

        this.command = fs.lstatSync(filePath).isFile()
            ? {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(this.filePath)]
            }
            : undefined;
    }
}

export class DockerfileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly dockerfilePath: string,
        public readonly microservice: MicroserviceItem
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Dockerfile for microservice: ${this.microservice.label}`;
        this.contextValue = 'dockerfile';
        this.iconPath = {
            light: path.join(__filename, '..', '..', 'images', 'dockerfile.svg'),
            dark: path.join(__filename, '..', '..', 'images', 'dockerfile.svg')
        };

        this.command = {
            command: 'vscode.open',
            title: 'Open Dockerfile',
            arguments: [vscode.Uri.file(this.dockerfilePath)]
        };
    }
}

export class DockerComposeItem extends vscode.TreeItem {
    constructor(
        public readonly dockerComposePath: string,
        public readonly project: ProjectItem
    ) {
        super('Docker Compose', vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Docker Compose for project: ${this.project.label}`;
        this.contextValue = 'dockerCompose';
        this.iconPath = {
            light: path.join(__filename, '..', '..', 'images', 'docker.svg'),
            dark: path.join(__filename, '..', '..', 'images', 'docker.svg')
        };

        this.command = {
            command: 'vscode.open',
            title: 'Open Docker Compose',
            arguments: [vscode.Uri.file(this.dockerComposePath)]
        };
    }
}

export function deactivate() {}

