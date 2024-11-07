import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function createProject() {
    try {
        console.log('Create Project command executed');
        const projectName = await vscode.window.showInputBox({ prompt: 'Enter the project name' });

        if (!projectName) {
            vscode.window.showErrorMessage('Project name is required');
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No folder or workspace opened');
            console.log('No folder or workspace opened');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        console.log(`Root path: ${rootPath}`);

        const projectPath = path.join(rootPath, `projects`, `${projectName}`);
        if (fs.existsSync(projectPath)) {
            vscode.window.showErrorMessage('Project already exists');
            return;
        }

        fs.mkdirSync(projectPath, { recursive: true });
        vscode.window.showInformationMessage(`Project ${projectName} created successfully`);
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to create project: ${error.message}`);
            console.error(`Error: ${error.message}`, error);
        } else {
            vscode.window.showErrorMessage('Failed to create project: Unknown error');
            console.error('Unknown error', error);
        }
    }
}
