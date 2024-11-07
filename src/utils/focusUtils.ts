import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function getMicroservices(rootPath: string): string[] {
    return fs.readdirSync(path.join(rootPath, 'microservices'))
        .filter(name => fs.lstatSync(path.join(rootPath, 'microservices', name)).isDirectory());
}

export async function focusMicroservice(rootPath: string, serviceName: string) {
    const microservicePath = path.join(rootPath, 'microservices', serviceName, 'app');

    const filesToOpen = getAllFiles(microservicePath)
        .filter((file: string) => !isTestFile(file) && path.basename(file) !== '__init__.py' && file.endsWith('.py'));

    for (const filePath of filesToOpen) {
        const openPath = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(openPath);
        await vscode.window.showTextDocument(doc, { preview: false });
    }
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath);
        }
    });

    return arrayOfFiles;
}

function isTestFile(filePath: string): boolean {
    const testDirectories = ['tests', 'schemas/tests', 'models/tests', 'crud/tests', 'db', 'auth', 'core', 'api/tests', 'api/v1/tests'];
    return testDirectories.some(dir => filePath.includes(dir));
}
