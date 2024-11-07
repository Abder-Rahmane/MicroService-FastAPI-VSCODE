import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getMicroservices, focusMicroservice } from '../utils/focusUtils';

export async function focusMicroserviceCommand() {
    try {
        console.log('Focus Microservice command executed');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No folder or workspace opened');
            console.log('No folder or workspace opened');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        console.log(`Root path: ${rootPath}`);

        const projects = fs.readdirSync(rootPath).filter((name: string) => {
            const projectPath = path.join(rootPath, name);
            return fs.lstatSync(projectPath).isDirectory() && fs.existsSync(path.join(projectPath, 'microservices'));
        });

        if (projects.length === 0) {
            vscode.window.showErrorMessage('No projects with microservices folder found.');
            return;
        }

        const selectedProject = await vscode.window.showQuickPick(projects, {
            placeHolder: 'Select a project'
        });

        if (!selectedProject) {
            return;
        }

        const projectPath = path.join(rootPath, selectedProject);
        const microservices = getMicroservices(projectPath);

        if (microservices.length === 0) {
            vscode.window.showErrorMessage('No microservices found in the selected project');
            return;
        }

        const selectedService = await vscode.window.showQuickPick(microservices, {
            placeHolder: 'Select a microservice to focus on'
        });

        if (selectedService) {
            await closeAllEditors();
            await focusMicroservice(projectPath, selectedService);
            vscode.window.showInformationMessage('All relevant files have been opened successfully!');
        }
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to focus microservice: ${error.message}`);
            console.error(`Error: ${error.message}`, error);
        } else {
            vscode.window.showErrorMessage('Failed to focus microservice: Unknown error');
            console.error('Unknown error', error);
        }
    }
}

async function closeAllEditors() {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}
