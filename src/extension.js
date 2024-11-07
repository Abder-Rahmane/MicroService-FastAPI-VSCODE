"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function activate(context) {
    console.log('Extension "focus-microservice" is now active!');
    let disposable = vscode.commands.registerCommand('extension.createMicroservice', async () => {
        try {
            console.log('Create Microservice command executed');
            const serviceName = await vscode.window.showInputBox({ prompt: 'Enter the microservice name' });
            if (!serviceName) {
                vscode.window.showErrorMessage('Microservice name is required');
                return;
            }
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No folder or workspace opened');
                return;
            }
            const rootPath = workspaceFolders[0].uri.fsPath;
            console.log(`Root path: ${rootPath}`);
            createMicroserviceStructure(rootPath, serviceName);
            updateMainPy(rootPath, serviceName);
            vscode.window.showInformationMessage(`Microservice ${serviceName} created successfully`);
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to create microservice: ${error.message}`);
                console.error(`Error: ${error.message}`, error);
            }
            else {
                vscode.window.showErrorMessage('Failed to create microservice: Unknown error');
                console.error('Unknown error', error);
            }
        }
    });
    context.subscriptions.push(disposable);
}
function createMicroserviceStructure(rootPath, serviceName) {
    const controllerPath = path.join(rootPath, 'Controller', `${serviceName}_controller`);
    const servicePath = path.join(rootPath, 'Services', `${serviceName}_service`);
    console.log(`Creating directories: ${controllerPath}, ${servicePath}`);
    fs.mkdirSync(controllerPath, { recursive: true });
    fs.mkdirSync(servicePath, { recursive: true });
    const controllerFilePath = path.join(controllerPath, `${serviceName}_controller.py`);
    const serviceFilePath = path.join(servicePath, `${serviceName}_service.py`);
    console.log(`Creating files: ${controllerFilePath}, ${serviceFilePath}`);
    if (!fs.existsSync(controllerFilePath)) {
        fs.writeFileSync(controllerFilePath, getControllerTemplate(serviceName));
    }
    if (!fs.existsSync(serviceFilePath)) {
        fs.writeFileSync(serviceFilePath, getServiceTemplate(serviceName));
    }
}
function updateMainPy(rootPath, serviceName) {
    const mainPyPath = path.join(rootPath, 'main.py');
    console.log(`Updating main.py: ${mainPyPath}`);
    let mainContent = '';
    if (fs.existsSync(mainPyPath)) {
        mainContent = fs.readFileSync(mainPyPath, 'utf-8');
    }
    const importStatement = `from Controller.${serviceName}_controller import ${serviceName}_controller\n`;
    const includeRouterStatement = `app.include_router(${serviceName}_controller.router, prefix="/${serviceName}s", tags=["${serviceName}s"])`;
    if (!mainContent.includes(importStatement)) {
        mainContent = importStatement + mainContent;
    }
    if (!mainContent.includes(includeRouterStatement)) {
        mainContent += `\n${includeRouterStatement}\n`;
    }
    fs.writeFileSync(mainPyPath, mainContent);
}
function getControllerTemplate(serviceName) {
    return `from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_${serviceName}s():
    return {"message": "Get ${serviceName}s"}

// Add more routes as needed
`;
}
function getServiceTemplate(serviceName) {
    return `class ${capitalize(serviceName)}Service:
    def __init__(self):
        pass

    # Add service methods as needed
`;
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function deactivate() {
    console.log('Extension "focus-microservice" is now deactivated.');
}
//# sourceMappingURL=extension.js.map