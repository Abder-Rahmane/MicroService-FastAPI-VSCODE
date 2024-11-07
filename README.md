![Microservice](https://img.shields.io/badge/Microservice-red)
![FastAPI](https://img.shields.io/badge/FastAPI-green)
![Docker](https://img.shields.io/badge/Docker-blue)
![Version](https://img.shields.io/badge/version-2.7.6---)

**MicroService FastAPI** is a powerful VS Code extension designed to streamline the creation, management, and deployment of FastAPI microservices. This extension helps developers efficiently handle microservices with Docker and now includes a Local launch mode, allowing users to switch between Docker and Local environments for greater flexibility.

## Features

### Commands

- **Create MicroService**: Quickly scaffold a new FastAPI microservice.
- **Focus**: Easily navigate and open relevant files for a specific microservice.
- **Show Docker Logs**: View real-time logs from Docker containers.



### Launch Modes

- **Docker Mode**: Manage and deploy your microservices using Docker containers.
- **Local Mode**: Run your microservices directly on your local machine without the need for Docker, providing a lightweight and faster development experience.

![Create Microservice Demo](https://raw.githubusercontent.com/Abder-Rahmane/MicroService-FastAPI-VSCODE/main/assets/swicthmode.gif)

<br>

## Quick Start

### Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for `MicroService FastAPI`
4. Click Install

<br>

### Creating a Microservice

1. Open the command palette (Ctrl+Shift+P)
2. Type `MicroService: Create MicroService`
3. Follow the prompts to create a new project and then create a new microservice within the project. If no project exists, it will prompt you to create one before creating the microservice.

![Create Microservice Demo](https://raw.githubusercontent.com/Abder-Rahmane/MicroService-FastAPI-VSCODE/main/assets/create.gif)

<br>

### Deploying a Microservice

1. In the sidebar, click on the Microservice Explorer view.
2. Right-click on the microservice you want to deploy or click the play button next to the project to deploy all microservices within the project.
3. Wait for the containers to start and view the logs.


![Deploy in Docker Demo](https://raw.githubusercontent.com/Abder-Rahmane/MicroService-FastAPI-VSCODE/main/assets/deploy.gif)

<br>

### Managing Microservices

Use the following commands to manage your microservices:

1. **Start Microservice**
2. **Stop Microservice**
3. **Restart Microservice** (also updates the microservice)

These commands can also be used to update the files and manage the state of your microservices.

![Manage Microservices Demo](https://raw.githubusercontent.com/Abder-Rahmane/MicroService-FastAPI-VSCODE/main/assets/command.gif)

<br>

### Additional Commands

In the menu with icons, you can access additional commands:

1. **Focus on a Microservice**: Click the focus icon to navigate and open relevant files for a specific microservice.
2. **Show Docker Logs**: Click the logs icon to view real-time logs from Docker containers for troubleshooting and monitoring.

![Additional Commands Demo](https://raw.githubusercontent.com/Abder-Rahmane/MicroService-FastAPI-VSCODE/main/assets/otherCommand.gif)

<br>

### Switching Launch Modes

You can easily switch between **Docker** and **Local** launch modes to run your microservices in the environment that best suits your development workflow.

1. Open the command palette (Ctrl+Shift+P).
2. Type `MicroService: Switch Launch Mode`.
3. Choose between **Docker** and **Local** modes.

- **Docker Mode**: Runs microservices inside Docker containers.
- **Local Mode**: Runs microservices directly on your local machine without Docker.

<br>

## Alembic Migrations

If you encounter issues with Alembic migrations, follow these steps to reset and reconfigure the migration setup :

1. **Delete the existing Alembic directory and `alembic.ini` file**:
```rm -rf alembic alembic.ini```

2. **Create a new Alembic directory in the app/ directory**:
```alembic init app/alembic```

3. **Update the sqlalchemy.url in the alembic.ini file to match your database schema URL**:
```sqlalchemy.url = <your_database_url>```

<br>

## Micro Service  Structure

```
<rootPath>
└── microservices
    └── example
        ├── app
        │   ├── __init__.py
        │   ├── main.py
        │   ├── core
        │   │   ├── __init__.py
        │   │   ├── config.py
        │   │   └── security.py
        │   ├── api
        │   │   ├── __init__.py
        │   │   └── v1
        │   │       ├── __init__.py
        │   │       └── endpoints
        │   │           ├── __init__.py
        │   │           ├── example_endpoint.py
        │   │           └── auth.py
        │   ├── models
        │   │   ├── __init__.py
        │   │   ├── example.py
        │   │   └── user_model.py
        │   ├── schemas
        │   │   ├── __init__.py
        │   │   ├── example.py
        │   │   └── user_schema.py
        │   ├── crud
        │   │   ├── __init__.py
        │   │   ├── example.py
        │   │   └── user_crud.py
        │   ├── db
        │   │   ├── __init__.py
        │   │   ├── base.py
        │   │   └── session.py
        │   ├── auth
        │   │   ├── __init__.py
        │   │   ├── jwt.py
        │   │   └── oauth2.py
        │   ├── tests
        │   │   ├── __init__.py
        │   │   ├── test_example.py
        │   │   └── test_auth.py
        ├── alembic
        │   ├── env.py
        │   ├── script.py.mako
        │   └── versions
        ├── scripts
        │   └── init_db.py
        ├── .env
        ├── .gitignore
        ├── requirements.txt
        ├── Dockerfile
        └── README.md
```

## Future Updates

We are planning to add the following features in future updates:

- A debugger to identify and fix issues when a microservice is not working correctly.
- Automated data migration using Alembic.
- Deployment support for multiple platforms including GCP, AWS, Heroku, and Vercel...

## Credits

Created by [MAGROUD Abderrahmane](https://www.linkedin.com/in/abder-rahmane-magroud/)
<br><br>
Hey developers! 🚀 Ready to take your microservices game to the next level? With this extension, creating and managing FastAPI microservices is as easy as pie. Remember, you can quickly focus on any microservice, restart Docker containers, and view logs in real-time. Enjoy coding, and don't forget to have fun while you're at it! 😄
<br><br>
For any feedback or suggestions, feel free to [contact us](mailto:reprend_05_cursif@icloud.com).


## License

[MIT](LICENSE)
