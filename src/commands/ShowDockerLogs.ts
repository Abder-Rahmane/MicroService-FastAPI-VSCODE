import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);


async function showLogsAfterStart(deploymentPath: string): Promise<void> {
    const terminal = vscode.window.createTerminal({
        name: `Docker Logs`,
        cwd: deploymentPath
    });

    terminal.sendText('docker-compose logs -f');
    terminal.show();
}

export async function showDockerLogs(selectedProjectPath?: string) {
    try {
        console.log('Show Docker Logs command executed');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No folder or workspace opened');
            console.log('No folder or workspace opened');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        console.log('Workspace root path:', rootPath);

        let deploymentPath: string;

        if (selectedProjectPath) {
            deploymentPath = path.join(rootPath, selectedProjectPath, 'deployment');
        } else {
            const projects = fs.readdirSync(rootPath).filter((name: string) => {
                const projectPath = path.join(rootPath, name);
                return fs.lstatSync(projectPath).isDirectory() && fs.existsSync(path.join(projectPath, 'deployment'));
            });

            if (projects.length === 0) {
                vscode.window.showErrorMessage('No projects with a deployment folder found.');
                return;
            }

            const selectedProject = await vscode.window.showQuickPick(projects, {
                placeHolder: 'Select a project'
            });

            if (!selectedProject) {
                return;
            }

            deploymentPath = path.join(rootPath, selectedProject, 'deployment');
        }

        
        await showLogsAfterStart(deploymentPath);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to show Docker logs: ${errorMessage}`);
    }
}