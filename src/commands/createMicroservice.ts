import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { createFullMicroserviceStructure, updateDockerCompose, normalizeName } from '../utils/createMicroserviceStructure';
import { MicroserviceProvider } from './DockerMicroserviceView';

async function createNewProject(rootPath: string): Promise<string | undefined> {
    const projectName = await vscode.window.showInputBox({ prompt: 'Enter the project name' });

    if (!projectName) {
        vscode.window.showErrorMessage('Project name is required');
        return undefined;
    }

    const normalizedProjectName = normalizeName(projectName);
    const newProjectPath = path.join(rootPath, normalizedProjectName);
    if (fs.existsSync(newProjectPath)) {
        vscode.window.showErrorMessage('Project already exists');
        return undefined;
    }

    fs.mkdirSync(newProjectPath, { recursive: true });
    vscode.window.showInformationMessage(`Project ${normalizedProjectName} created successfully`);
    return normalizedProjectName;
}

export async function createMicroserviceCommand(treeDataProvider: MicroserviceProvider): Promise<void> {
    try {
        console.log('Create Microservice command executed');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No folder or workspace opened');
            console.log('No folder or workspace opened');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;

        const projects = fs.readdirSync(rootPath).filter(name => {
           const projectPath = path.join(rootPath, name);
           return fs.lstatSync(projectPath).isDirectory() && fs.existsSync(path.join(projectPath, 'project-config.json'));
         });

        let project: string | undefined;
        if (projects.length > 0) {
            project = await vscode.window.showQuickPick(['Create new project', ...projects], { placeHolder: 'Select a project or create a new one' });
            if (!project) {
                return;
            }

            if (project === 'Create new project') {
                project = await createNewProject(rootPath);
                if (!project) {
                    return;
                }
            } else {
                project = normalizeName(project);
            }
        } else {
            project = await createNewProject(rootPath);
            if (!project) {
                return;
            }
        }

        const serviceName = await vscode.window.showInputBox({ prompt: 'Enter the microservice name' });
        if (!serviceName) {
            vscode.window.showErrorMessage('Microservice name is required');
            return;
        }

        const normalizedServiceName = normalizeName(serviceName);
        const projectPath = path.join(rootPath, project);
        console.log(`Project path: ${projectPath}`);

        await createMicroservice(projectPath, normalizedServiceName);
        (treeDataProvider as MicroserviceProvider).refresh();
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to create microservice: ${error.message}`);
            console.error(`Error: ${error.message}`, error);
        } else {
            vscode.window.showErrorMessage('Failed to create microservice: Unknown error');
            console.error('Unknown error', error);
        }
    }
}

export async function createMicroservice(projectPath: string, serviceName: string): Promise<void> {
    try {
        const normalizedServiceName = normalizeName(serviceName);
        if (createFullMicroserviceStructure(projectPath, normalizedServiceName)) {
            updateDockerCompose(projectPath, path.basename(projectPath), normalizedServiceName);
            vscode.window.showInformationMessage(`Microservice ${normalizedServiceName} created successfully`);
        }
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to create microservice: ${error.message}`);
            console.error(`Error: ${error.message}`, error);
        } else {
            vscode.window.showErrorMessage('Failed to create microservice: Unknown error');
            console.error('Unknown error', error);
        }
    }
}
