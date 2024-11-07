import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export class LocalMicroserviceProvider implements vscode.TreeDataProvider<LocalProjectItem | LocalMicroserviceItem | FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<LocalProjectItem | LocalMicroserviceItem | FileItem | undefined | void> = new vscode.EventEmitter<LocalProjectItem | LocalMicroserviceItem | FileItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<LocalProjectItem | LocalMicroserviceItem | FileItem | undefined | void> = this._onDidChangeTreeData.event;

    private projectPath: string;
    private microserviceStatuses: Map<string, string> = new Map();
    public runningTerminals: Map<string, vscode.Terminal> = new Map();

    constructor(projectPath: string) {
        this.projectPath = projectPath;

        vscode.window.onDidCloseTerminal(this.onTerminalClosed.bind(this));

        this.initializeFileWatchers();
    }



    private initializeFileWatchers() {
        const projectWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.projectPath, '**/project-config.json'));
    
        projectWatcher.onDidCreate(() => this.refresh());
        projectWatcher.onDidChange(() => this.refresh());
        projectWatcher.onDidDelete(() => this.refresh());
    
        const microserviceWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.projectPath, '**/microservices/*'));
    
        microserviceWatcher.onDidCreate(() => this.refresh());
        microserviceWatcher.onDidChange(() => this.refresh());
        microserviceWatcher.onDidDelete(() => this.refresh());
    }

    private onTerminalClosed(closedTerminal: vscode.Terminal): void {
        for (const [label, terminal] of this.runningTerminals.entries()) {
            if (terminal === closedTerminal) {
                this.runningTerminals.delete(label);

                this.microserviceStatuses.set(label, 'stopped');

                this.refresh();
                break;
            }
        }
    }

    getTreeItem(element: LocalProjectItem | LocalMicroserviceItem | FileItem): vscode.TreeItem {
        if (element instanceof LocalMicroserviceItem) {
            element.updateIconAndCommand(element.status); 
        }
        return element;
    }


    async getRunningLocalMicroservicesCount(project: LocalProjectItem): Promise<{ running: number, total: number }> {
        const microservices = await this.getMicroservices(project);
        const running = microservices.filter(ms => ms.status === 'running').length;
        return { running, total: microservices.length };
    }

    async refresh(): Promise<void> {
        await this.updateProjectDescriptions(); 
        this._onDidChangeTreeData.fire(); 
    }

    public async updateProjectDescriptions() {
        const projects = this.getProjects();
        for (const project of projects) {
            const { running, total } = await this.getRunningLocalMicroservicesCount(project);
            project.description = `${running} / ${total} running`;
            this.updateItem(project);
        }
    }
    
    public updateItem(item: LocalProjectItem): void {
        this._onDidChangeTreeData.fire(item);
    }


    async getChildren(element?: LocalProjectItem | LocalMicroserviceItem | FileItem): Promise<(LocalProjectItem | LocalMicroserviceItem | FileItem)[]> {
        if (element instanceof LocalProjectItem) {
            const microservices = await this.getMicroservices(element);
            return microservices;
        } else if (!element) {
            const projects = this.getProjects();
            if (projects.length === 0) {
                const messageItem = new MessageItem('No projects or microservices found. Click here to create one.', {
                    command: 'extension.createMicroservice',
                    title: 'Create Microservice'
                });
                return Promise.resolve([messageItem as any]);
            } else {
                return projects;
            }
        }
        return [];
    }

    getProjects(): LocalProjectItem[] {
        if (fs.existsSync(this.projectPath)) {
            const projectDirectories = fs.readdirSync(this.projectPath).filter(name => {
                const projectDir = path.join(this.projectPath, name);
                return fs.lstatSync(projectDir).isDirectory() && fs.existsSync(path.join(projectDir, 'project-config.json'));
            });
            return projectDirectories.map(name => new LocalProjectItem(name, path.join(this.projectPath, name), this));
        } else {
            return [];
        }
    }

    async getMicroservices(project: LocalProjectItem): Promise<LocalMicroserviceItem[]> {
        const microservicesPath = path.join(project.projectPath, 'microservices');
        if (fs.existsSync(microservicesPath)) {
            const microserviceDirectories = fs.readdirSync(microservicesPath).filter(name =>
                fs.lstatSync(path.join(microservicesPath, name)).isDirectory());
            return microserviceDirectories.map(name => {
                const status = this.microserviceStatuses.get(name) || 'stopped';
                return new LocalMicroserviceItem(name, path.join(microservicesPath, name), project, status, this);
            });
        } else {
            return [];
        }
    }

    public setMicroserviceStatus(name: string, status: string): void {
        this.microserviceStatuses.set(name, status);
    }

    public getMicroserviceStatus(name: string): string | undefined {
        return this.microserviceStatuses.get(name);
    }
}

export class LocalProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly projectPath: string,
        localMicroserviceProvider: LocalMicroserviceProvider
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.tooltip = `Project: ${this.label}`;
        this.contextValue = 'project';
        this.iconPath = {
            light: path.join(__filename, '..', '..', 'images', 'project.svg'),
            dark: path.join(__filename, '..', '..', 'images', 'project.svg')
        };

        localMicroserviceProvider.getRunningLocalMicroservicesCount(this).then(({ running, total }) => {
            this.description = `${running} / ${total} running`;
            localMicroserviceProvider.updateItem(this);
        });
    }
}

export class LocalMicroserviceItem extends vscode.TreeItem {
    private provider: LocalMicroserviceProvider;

    constructor(
        public readonly label: string,
        public readonly servicePath: string,
        public readonly project: LocalProjectItem,
        public status: string,
        provider: LocalMicroserviceProvider
    ) {
        super(`${label}: microservice`, vscode.TreeItemCollapsibleState.None);
        this.provider = provider;
        this.tooltip = `Microservice: ${this.label}`;
        this.contextValue = 'microservice';
        this.description = status; 
        this.updateIconAndCommand(status);
    }

    public updateIconAndCommand(status: string): void {
        console.log(`Updating icon for status: ${status}`);
        if (status === 'running') {
            console.log('Setting stop.svg');
            this.iconPath = {
                light: path.join(__filename, '..', '..', 'images', 'stop.svg'),
                dark: path.join(__filename, '..', '..', 'images', 'stop.svg')
            };
            this.command = {
                command: 'extension.stopMicroservice',
                title: 'Stop Microservice',
                arguments: [this.label, this.servicePath, this.project.projectPath],
                tooltip: 'Stop this microservice',
            };
        } else if (status === 'stopped') {
            console.log('Setting play.svg');
            this.iconPath = {
                light: path.join(__filename, '..', '..', 'images', 'play.svg'),
                dark: path.join(__filename, '..', '..', 'images', 'play.svg')
            };
            this.command = {
                command: 'extension.startMicroservice',
                title: 'Start Microservice',
                arguments: [this.label, this.servicePath, this.project.projectPath],
                tooltip: 'Start this microservice',
            };
        }
    }

    public async startService(): Promise<void> {
        if (this.provider.runningTerminals.has(this.label)) {
            vscode.window.showWarningMessage(`Microservice "${this.label}" is already running.`);
            return;
        }

        vscode.window.showInformationMessage(`Starting local microservice: ${this.label}`);
        
        const appPath = path.join(this.servicePath, 'app', 'main.py');
        const dockerComposePath = path.join(this.project.projectPath, 'deployment', 'docker-compose.yml');
    
        if (!fs.existsSync(appPath)) {
            vscode.window.showErrorMessage(`main.py not found in ${path.dirname(appPath)}`);
            return;
        }
    
        if (!fs.existsSync(dockerComposePath)) {
            vscode.window.showErrorMessage(`docker-compose.yml not found in ${path.dirname(dockerComposePath)}`);
            return;
        }
    
        
        const port = await this.getPortFromDockerCompose(dockerComposePath, this.label);
        if (!port) {
            vscode.window.showErrorMessage(`Could not find port for microservice "${this.label}" in docker-compose.yml`);
            return;
        }
    
        let command = `uvicorn app.main:app --reload --port ${port}`;
        if (process.platform === 'win32') {
            command = `python -m uvicorn app.main:app --reload --port ${port}`;
        }
    
        const terminal = vscode.window.createTerminal({
            name: `Microservice: ${this.label}`,
            cwd: this.servicePath,
        });
    
        terminal.show();
        terminal.sendText(command);
    
        this.provider.runningTerminals.set(this.label, terminal);
    
        this.status = 'running';
        this.description = 'running';
        this.provider.setMicroserviceStatus(this.label, this.status); 
        this.updateIconAndCommand(this.status); 
        await this.provider.updateProjectDescriptions();
        this.provider.refresh(); 
    
        
        const delay = 3000; 
        setTimeout(() => {
            vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/docs`));
        }, delay);
    
        console.log(`Service "${this.label}" status: ${this.status}`);
    }

    async stopService(): Promise<string> {
        try {
            const terminal = this.provider.runningTerminals.get(this.label);
            if (terminal) {
                terminal.dispose();
                this.provider.runningTerminals.delete(this.label);

                this.status = 'stopped';
                this.description = 'stopped';
                this.updateIconAndCommand('stopped');
                this.provider.setMicroserviceStatus(this.label, this.status); 
                this.updateIconAndCommand(this.status); 
                await this.provider.updateProjectDescriptions();
                this.provider.refresh(); 

                vscode.window.showInformationMessage(`Stopped local microservice: ${this.label}`);
                return 'stopped';
            } else {
                vscode.window.showWarningMessage(`Microservice "${this.label}" is not running.`);
                return 'alreadyStopped';
            }
        } catch (error) {
            console.error(`Failed to stop local microservice "${this.label}":`, error);
            vscode.window.showErrorMessage(`Failed to stop microservice "${this.label}".`);
            return 'failed';
        }
    }

    private async getPortFromDockerCompose(dockerComposePath: string, serviceName: string): Promise<number | null> {
        try {
            const fileContent = fs.readFileSync(dockerComposePath, 'utf8');
            const dockerCompose = yaml.load(fileContent) as any;

            const services = dockerCompose.services;
            if (services) {
                const normalizedServiceName = `microservice-${normalizeName(serviceName)}`;
                const service = services[normalizedServiceName];
                if (service && service.ports && service.ports.length > 0) {
                    const portMapping = service.ports[0];
                    const port = portMapping.split(':')[0]; 
                    return parseInt(port, 10);
                }
            }
            return null;
        } catch (error) {
            console.error(`Error reading docker-compose.yml: ${error}`);
            return null;
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
        this.iconPath = fs.lstatSync(filePath).isDirectory() ? vscode.ThemeIcon.Folder : vscode.ThemeIcon.File;
        this.command = fs.lstatSync(filePath).isFile() ? {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(this.filePath)]
        } : undefined;
    }
}
