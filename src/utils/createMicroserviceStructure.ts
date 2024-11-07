import * as fs from 'fs';
import * as path from 'path';


export function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
        .replace(/[^a-z0-9]+/g, '') 
        .replace(/^-+|-+$/g, ''); 
}


export function createFullMicroserviceStructure(projectPath: string, serviceName: string): boolean {
    try {
        const normalizedServiceName = normalizeName(serviceName);
        const microservicePath = path.join(projectPath, 'microservices', normalizedServiceName);
        const appPath = path.join(microservicePath, 'app');
        const corePath = path.join(appPath, 'core');
        const apiPath = path.join(appPath, 'api');
        const apiV1Path = path.join(apiPath, 'v1');
        const endpointsPath = path.join(apiV1Path, 'endpoints');
        const modelsPath = path.join(appPath, 'models');
        const schemasPath = path.join(appPath, 'schemas');
        const crudPath = path.join(appPath, 'crud');
        const dbPath = path.join(appPath, 'db');
        const authPath = path.join(appPath, 'auth');
        const testsPath = path.join(appPath, 'tests');
        const alembicPath = path.join(microservicePath, 'alembic');
        const alembicVersionsPath = path.join(alembicPath, 'versions');
        const alembicPycachePath = path.join(alembicPath, '__pycache__');
        const alembicVersionsPycachePath = path.join(alembicVersionsPath, '__pycache__');
        const alembicReadmePath = path.join(alembicPath, 'README');
        const alembicIniPath = path.join(microservicePath, 'alembic.ini');
        const scriptsPath = path.join(microservicePath, 'scripts');
        const deploymentPath = path.join(projectPath, 'deployment');

        console.log(`Creating directories for microservice: ${microservicePath}`);

        const directories = [
            appPath,
            corePath,
            testsPath,
            apiPath,
            apiV1Path,
            endpointsPath,
            modelsPath,
            schemasPath,
            crudPath,
            dbPath,
            authPath,
            alembicPath,
            alembicVersionsPath,
            alembicPycachePath,  
            alembicVersionsPycachePath,  
            scriptsPath,
            deploymentPath,
        ];

        directories.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

        const files = [
            { filePath: path.join(appPath, '__init__.py'), content: getInitPyContent() },
            { filePath: path.join(appPath, 'main.py'), content: getMainPyContent(normalizedServiceName) },
            { filePath: path.join(corePath, '__init__.py'), content: '' },
            { filePath: path.join(corePath, 'config.py'), content: getConfigContent() },
            { filePath: path.join(corePath, 'security.py'), content: getSecurityContent() },
            { filePath: path.join(apiPath, '__init__.py'), content: getApiInitPyContent() },
            { filePath: path.join(apiV1Path, '__init__.py'), content: getApiV1InitPyContent() },
            { filePath: path.join(endpointsPath, '__init__.py'), content: getEndpointsInitPyContent() },
            { filePath: path.join(endpointsPath, `${normalizedServiceName}_endpoint.py`), content: getEndpointContent(normalizedServiceName) },
            { filePath: path.join(endpointsPath, 'auth.py'), content: getAuthEndpointContent() },
            { filePath: path.join(modelsPath, '__init__.py'), content: '' },
            { filePath: path.join(modelsPath, `${normalizedServiceName}.py`), content: getModelContent(normalizedServiceName) },
            { filePath: path.join(modelsPath, 'user_model.py'), content: getUserModelContent() },
            { filePath: path.join(schemasPath, '__init__.py'), content: '' },
            { filePath: path.join(schemasPath, `${normalizedServiceName}.py`), content: getSchemaContent(normalizedServiceName) },
            { filePath: path.join(schemasPath, 'user_schema.py'), content: getUserSchemaContent() },
            { filePath: path.join(crudPath, '__init__.py'), content: '' },
            { filePath: path.join(crudPath, `${normalizedServiceName}.py`), content: getCrudContent(normalizedServiceName) },
            { filePath: path.join(crudPath, 'user_crud.py'), content: getUserCrudContent() },
            { filePath: path.join(dbPath, '__init__.py'), content: '' },
            { filePath: path.join(dbPath, 'base.py'), content: getBaseContent() },
            { filePath: path.join(dbPath, 'session.py'), content: getSessionContent() },
            { filePath: path.join(authPath, '__init__.py'), content: '' },
            { filePath: path.join(authPath, 'jwt.py'), content: getJwtContent() },
            { filePath: path.join(authPath, 'oauth2.py'), content: getOauth2Content() },
            { filePath: path.join(testsPath, '__init__.py'), content: '' },
            { filePath: path.join(testsPath, 'test_example.py'), content: getTestContent(normalizedServiceName) },
            { filePath: path.join(testsPath, 'test_auth.py'), content: getTestAuthContent() },
            { filePath: path.join(alembicPath, 'env.py'), content: getAlembicEnvContent() },
            { filePath: path.join(alembicPath, 'script.py.mako'), content: getAlembicScriptContent() },
            { filePath: alembicReadmePath, content: 'Generic single-database configuration.' },  
            { filePath: alembicIniPath, content: getAlembicIniContent() },  
            { filePath: path.join(scriptsPath, 'init_db.py'), content: getInitDbContent() },
            { filePath: path.join(microservicePath, '.env'), content: getEnvContent() },
            { filePath: path.join(microservicePath, '.gitignore'), content: getGitignoreContent() },
            { filePath: path.join(microservicePath, 'requirements.txt'), content: getRequirementsContent() },
            { filePath: path.join(microservicePath, 'Dockerfile'), content: getDockerfileContent(normalizedServiceName) },
            { filePath: path.join(projectPath, 'project-config.json'), content: JSON.stringify({ name: projectPath }, null, 2) }
        ];

        files.forEach(file => {
            fs.writeFileSync(file.filePath, file.content);
        });

        const microservicesRootPath = path.join(projectPath, 'microservices');
        const readmeFilePath = path.join(microservicesRootPath, 'README.md');
        fs.writeFileSync(readmeFilePath, getArchitectureReadmeContent());

        return true;
    } catch (error) {
        console.error('Error creating microservice structure:', error);
        return false;
    }
}

function getAllUsedPorts(rootPath: string): number[] {
    const usedPorts = new Set<number>();
    const projects = fs.readdirSync(rootPath).filter(name => fs.lstatSync(path.join(rootPath, name)).isDirectory() && name !== 'deployment');

    projects.forEach(project => {
        const dockerComposePath = path.join(rootPath, project, 'deployment', 'docker-compose.yml');
        if (fs.existsSync(dockerComposePath)) {
            const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf-8');
            const portMatches = dockerComposeContent.match(/- "(\d+):8000"/g);
            if (portMatches) {
                portMatches.forEach(portMatch => {
                    const matchResult = portMatch.match(/(\d+):8000/);
                    if (matchResult && matchResult[1]) {
                        const port = parseInt(matchResult[1], 10);
                        usedPorts.add(port);
                    }
                });
            }
        }
    });

    return Array.from(usedPorts);
}

function findNextAvailablePort(usedPorts: number[]): number {
    let port = 8000;
    while (usedPorts.includes(port)) {
        port += 1;
    }
    return port;
}

export function updateDockerCompose(projectPath: string, projectName: string, serviceName: string) {
    const dockerComposePath = path.join(projectPath, 'deployment', 'docker-compose.yml');
    let dockerComposeContent = '';

    if (fs.existsSync(dockerComposePath)) {
        dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf-8');
    } else {
        dockerComposeContent = '\nservices:\n';
    }

    const rootPath = path.dirname(projectPath);
    const usedPorts = getAllUsedPorts(rootPath);
    const servicePort = findNextAvailablePort(usedPorts);

    const normalizedProjectName = normalizeName(projectName);
    const normalizedServiceName = `microservice-${normalizeName(serviceName)}`;
    const servicePath = `../microservices/${normalizedServiceName.replace('microservice-', '')}`;
    const existingServices = dockerComposeContent.match(/^\s*([a-z0-9_-]+):/gm) || [];

    const serviceConfig = `
  ${normalizedServiceName}:
    build:
      context: ${servicePath}
    container_name: ${normalizedProjectName}-${normalizedServiceName}
    ports:
      - "${servicePort}:8000"
    environment:
      - DATABASE_URL=sqlite:///./test.db
`;

    if (!dockerComposeContent.includes(normalizedServiceName)) {
        dockerComposeContent += serviceConfig;
    }

    fs.writeFileSync(dockerComposePath, dockerComposeContent.trim());
}

function getArchitectureReadmeContent(): string {
    return `
## Microservice Structure

\`\`\`
<rootPath>
└── microservices
    └── <service_name>
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
        │   │           ├── <service_name>_endpoint.py
        │   │           └── auth.py
        │   ├── models
        │   │   ├── __init__.py
        │   │   ├── <service_name>.py
        │   │   └── user_model.py
        │   ├── schemas
        │   │   ├── __init__.py
        │   │   ├── <service_name>.py
        │   │   └── user_schema.py
        │   ├── crud
        │   │   ├── __init__.py
        │   │   ├── <service_name>.py
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
\`\`\`

This microservice structure uses FastAPI to create web applications and APIs. Here is a description of the main folders and files:

- **app**: Contains the main source code of the application.
  - **main.py**: Main entry point of the application.
  - **core**: Contains configurations and security modules.
  - **api**: Manages API routes.
  - **models**: Defines database models.
  - **schemas**: Contains Pydantic schemas for data validation.
  - **crud**: Contains CRUD operations for the models.
  - **db**: Manages database connections.
  - **auth**: Contains authentication and authorization modules.
  - **tests**: Contains unit and functional tests.

- **alembic**: Manages database migrations.
- **scripts**: Contains utility scripts, for example, to initialize the database.
- **.env**: Environment variable configuration file.
- **.gitignore**: File to ignore certain files/folders in Git.
- **requirements.txt**: List of Python dependencies.
- **Dockerfile**: Contains instructions to build the Docker image of the microservice.
- **README.md**: Microservice documentation.
`;
}


function getInitPyContent(): string {
    return `# app/__init__.py
`;
}

function getMainPyContent(serviceName: string): string {
    return `from fastapi import FastAPI
from app.api.v1.endpoints.${serviceName}_endpoint import router as ${serviceName}_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(${serviceName}_router, prefix="/${serviceName}", tags=["${serviceName}"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
`;
}

function getApiInitPyContent(): string {
    return `# app/api/__init__.py
`;
}

function getApiV1InitPyContent(): string {
    return `# app/api/v1/__init__.py
`;
}

function getEndpointsInitPyContent(): string {
    return `# app/api/v1/endpoints/__init__.py
`;
}

function getConfigContent(): string {
    return `from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./test.db"
    secret_key: str = "supersecretkey"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
`;
}

function getSecurityContent(): string {
    return `from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)
`;
}

function getEndpointContent(serviceName: string): string {
    const capitalizedServiceName = capitalize(serviceName);
    return `from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.${serviceName} import *
from app.schemas.${serviceName} import *
from app.db.session import get_db

router = APIRouter()

@router.post("/", response_model=${capitalizedServiceName})
def create_${serviceName}(item: ${capitalizedServiceName}Create, db: Session = Depends(get_db)):
    return create_${serviceName}(db=db, item=item)

@router.get("/{item_id}", response_model=${capitalizedServiceName})
def read_${serviceName}(item_id: int, db: Session = Depends(get_db)):
    db_item = get_${serviceName}(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="${capitalizedServiceName} not found")
    return db_item

@router.put("/{item_id}", response_model=${capitalizedServiceName})
def update_${serviceName}(item_id: int, item: ${capitalizedServiceName}Create, db: Session = Depends(get_db)):
    db_item = get_${serviceName}(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="${capitalizedServiceName} not found")
    return update_${serviceName}(db=db, db_item=db_item, item=item)

@router.delete("/{item_id}", response_model=${capitalizedServiceName})
def delete_${serviceName}(item_id: int, db: Session = Depends(get_db)):
    db_item = get_${serviceName}(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="${capitalizedServiceName} not found")
    return delete_${serviceName}(db=db, item_id=item_id)

# Add more routes as needed
`;
}
function getAuthEndpointContent(): string {
    return `from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app import crud, schemas
from app.db.session import get_db
from app.auth.jwt import create_access_token
from app.auth.oauth2 import get_current_user
from app.core.security import verify_password

router = APIRouter()

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user
`;
}

function getModelContent(serviceName: string): string {
    return `from sqlalchemy import Column, Integer, String
from app.db.base import Base

class ${capitalize(serviceName)}(Base):
    __tablename__ = "${serviceName}s"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, index=True)
`;
}

function getUserModelContent(): string {
    return `from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
`;
}

function getSchemaContent(serviceName: string): string {
    const capitalizedServiceName = capitalize(serviceName);
    return `from pydantic import BaseModel

class ${capitalizedServiceName}Base(BaseModel):
    name: str
    description: str

class ${capitalizedServiceName}Create(${capitalizedServiceName}Base):
    pass

class ${capitalizedServiceName}(${capitalizedServiceName}Base):
    id: int

    class Config:
        from_attributes = True
`;
}


function getUserSchemaContent(): string {
    return `from pydantic import BaseModel

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    full_name: str
    is_active: bool
    is_superuser: bool

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None
`;
}

function getCrudContent(serviceName: string): string {
    return `from sqlalchemy.orm import Session
from app.models.${serviceName} import *
from app.schemas.${serviceName} import *

def get_${serviceName}(db: Session, item_id: int):
    return db.query(${capitalize(serviceName)}).filter(${capitalize(serviceName)}.id == item_id).first()

def create_${serviceName}(db: Session, item: ${capitalize(serviceName)}Create):
    db_item = ${capitalize(serviceName)}(name=item.name, description=item.description)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_${serviceName}(db: Session, db_item: ${capitalize(serviceName)}, item: ${capitalize(serviceName)}Create):
    db_item.name = item.name
    db_item.description = item.description
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_${serviceName}(db: Session, item_id: int):
    db_item = db.query(${capitalize(serviceName)}).filter(${capitalize(serviceName)}.id == item_id).first()
    db.delete(db_item)
    db.commit()
    return db_item
`;
}

function getUserCrudContent(): string {
    return `from sqlalchemy.orm import Session
from app.models.user_model import User
from app.schemas.user_schema import UserCreate

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate):
    fake_hashed_password = user.password + "notreallyhashed"
    db_user = User(username=user.username, email=user.email, hashed_password=fake_hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
`;
}

function getBaseContent(): string {
    return `from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
`;
}

function getSessionContent(): string {
    return `from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`;
}

function getJwtContent(): string {
    return `from datetime import datetime, timedelta
from jose import JWTError, jwt
from app.schemas.user_schema import TokenData
from app.core.config import settings

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    return token_data
`;
}

function getOauth2Content(): string {
    return `from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.auth.jwt import verify_token
from app.db.session import get_db
from app.models.user_model import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = verify_token(token, credentials_exception)
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user
`;
}

function getTestContent(serviceName: string): string {
    return `from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_${serviceName}():
    response = client.post("/${serviceName}/", json={"name": "Test ${capitalize(serviceName)}", "description": "A ${serviceName} for testing"})
    assert response.status_code == 200
    assert response.json()["name"] == "Test ${capitalize(serviceName)}"

def test_read_${serviceName}():
    response = client.post("/${serviceName}/", json={"name": "Test ${capitalize(serviceName)}", "description": "A ${serviceName} for testing"})
    item_id = response.json()["id"]
    response = client.get(f"/${serviceName}/{item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test ${capitalize(serviceName)}"

def test_update_${serviceName}():
    response = client.post("/${serviceName}/", json={"name": "Test ${capitalize(serviceName)}", "description": "A ${serviceName} for testing"})
    item_id = response.json()["id"]
    response = client.put(f"/${serviceName}/{item_id}", json={"name": "Updated ${capitalize(serviceName)}", "description": "Updated description"})
    assert response.status_code == 200
    assert response.json()["name"] == "Updated ${capitalize(serviceName)}"

def test_delete_${serviceName}():
    response = client.post("/${serviceName}/", json={"name": "Test ${capitalize(serviceName)}", "description": "A ${serviceName} for testing"})
    item_id = response.json()["id"]
    response = client.delete(f"/${serviceName}/{item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test ${capitalize(serviceName)}"
`;
}

function getTestAuthContent(): string {
    return `from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login():
    response = client.post("/token", data={"username": "testuser", "password": "testpassword"})
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_get_current_user():
    response = client.post("/token", data={"username": "testuser", "password": "testpassword"})
    token = response.json()["access_token"]
    response = client.get("/users/me/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"
`;
}

function getAlembicEnvContent(): string {
    return `from __future__ import with_statement
from alembic import context
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.base import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline():
    """Run migrations in 'offline' mode.
    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well. By skipping the Engine creation
    we don't even need a DBAPI to be available.
    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, target_metadata=target_metadata, literal_binds=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.
    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
`;
}



function getAlembicScriptContent(): string {
    return `"""
\${message}

Revision ID: \${up_revision}
Revises: \${down_revision ? down_revision : 'None'}
Create Date: \${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
\${imports ? imports : ""}

# revision identifiers, used by Alembic.
revision: str = \${JSON.stringify(up_revision)}
down_revision: Union<string, None> = \${down_revision ? JSON.stringify(down_revision) : 'None'}
branch_labels: Union<string, Sequence<string>, None> = \${branch_labels ? JSON.stringify(branch_labels) : 'None'}
depends_on: Union<string, Sequence<string>, None> = \${depends_on ? JSON.stringify(depends_on) : 'None'}

def upgrade() -> None:
    \${upgrades ? upgrades : "pass"}

def downgrade() -> None:
    \${downgrades ? downgrades : "pass"}
`;
}

function getInitDbContent(): string {
    return `from app.db.session import engine
from app.db.base import Base

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
`;
}

function getEnvContent(): string {
    return `DATABASE_URL=sqlite:///./test.db
SECRET_KEY=supersecretkey
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
`;
}

function getGitignoreContent(): string {
    return `# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
pip-wheel-metadata/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg

# PyInstaller
#  Usually these files are written by a python script from a template
#  before PyInstaller builds the exe, so as to inject date/other infos into it.
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.hypothesis/
.pytest_cache/
cover/

# Translations
*.mo
*.pot

# Django stuff:
*.log
local_settings.py
db.sqlite3

# Flask stuff:
instance/
.webassets-cache

# Scrapy stuff:
.scrapy

# Sphinx documentation
docs/_build/

# PyBuilder
target/

# Jupyter Notebook
.ipynb_checkpoints

# IPython
profile_default/
ipython_config.py

# pyenv
.python-version

# celery beat schedule file
celerybeat-schedule

# dotenv
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Spyder project settings
.spyderproject
.spyproject

# Rope project settings
.ropeproject

# mkdocs documentation
/site

# mypy
.mypy_cache/
.dmypy.json
dmypy.json

# Pyre type checker
.pyre/
`;
}

function getRequirementsContent(): string {
    return `fastapi
sqlalchemy
pydantic
uvicorn
passlib[bcrypt]
pytest
pydantic-settings
`;
}

function getDockerfileContent(serviceName: string): string {
    return `FROM tiangolo/uvicorn-gunicorn-fastapi:python3.8

WORKDIR /app

COPY ./app /app/app
COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
}

function getReadmeContent(serviceName: string): string {
    return `# ${capitalize(serviceName)} Microservice

This microservice handles ${serviceName} management using FastAPI.

## Installation

### Prerequisites

- Python 3.7+
- Pip
- Virtualenv (optional but recommended)

### Setup

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/your-repo/${serviceName}-microservice.git
   cd ${serviceName}-microservice
   \`\`\`

2. Create and activate a virtual environment:
   \`\`\`bash
   python -m venv env
   source env/bin/activate  # On Windows use "env\\Scripts\\activate"
   \`\`\`

3. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

4. Run the application:
   \`\`\`bash
   uvicorn app.main:app --reload
   \`\`\`

5. Open your browser and navigate to:
   \`\`\`url
   http://127.0.0.1:8000/docs
   \`\`\`
`;
}

function getKubernetesDeploymentContent(serviceName: string): string {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${serviceName}-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${serviceName}
  template:
    metadata:
      labels:
        app: ${serviceName}
    spec:
      containers:
      - name: ${serviceName}
        image: your-docker-registry/${serviceName}:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "sqlite:///./test.db"
`;
}

function getKubernetesServiceContent(serviceName: string): string {
    return `apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}-service
spec:
  selector:
    app: ${serviceName}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
  type: LoadBalancer
`;
}

function getGatewayMainContent(): string {
    return `from fastapi import FastAPI
from gateway.router import router

app = FastAPI()

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
`;
}


function getGatewayRouterContent(): string {
    return `from fastapi import APIRouter
from gateway.config import MICROSERVICE_URLS

router = APIRouter()

@router.get("/services/{service_name}/")
async def proxy_request(service_name: str):
    if service_name not in MICROSERVICE_URLS:
        return {"error": "Service not found"}
    # Logic to proxy request to the corresponding microservice
    return {"message": f"Proxied request to {MICROSERVICE_URLS[service_name]}"}
`;
}



function getAlembicIniContent(): string {
    return `
# A generic, single database configuration.

[alembic]
# path to migration scripts
# Use forward slashes (/) also on windows to provide an os agnostic path
script_location = alembic

# template used to generate migration file names; The default value is %%(rev)s_%%(slug)s
# Uncomment the line below if you want the files to be prepended with date and time
# see https://alembic.sqlalchemy.org/en/latest/tutorial.html#editing-the-ini-file
# for all available tokens
# file_template = %%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d-%%(rev)s_%%(slug)s

# sys.path path, will be prepended to sys.path if present.
# defaults to the current working directory.
prepend_sys_path = .

# timezone to use when rendering the date within the migration file
# as well as the filename.
# If specified, requires the python>=3.9 or backports.zoneinfo library.
# Any required deps can installed by adding \`alembic[tz]\` to the pip requirements
# string value is passed to ZoneInfo()
# leave blank for localtime
# timezone =

# max length of characters to apply to the "slug" field
# truncate_slug_length = 40

# set to 'true' to run the environment during
# the 'revision' command, regardless of autogenerate
# revision_environment = false

# set to 'true' to allow .pyc and .pyo files without
# a source .py file to be detected as revisions in the
# versions/ directory
# sourceless = false

# version location specification; This defaults
# to alembic/versions.  When using multiple version
# directories, initial revisions must be specified with --version-path.
# The path separator used here should be the separator specified by "version_path_separator" below.
# version_locations = %(here)s/bar:%(here)s/bat:alembic/versions

# version path separator; As mentioned above, this is the character used to split
# version_locations. The default within new alembic.ini files is "os", which uses os.pathsep.
# If this key is omitted entirely, it falls back to the legacy behavior of splitting on spaces and/or commas.
# Valid values for version_path_separator are:
#
# version_path_separator = :
# version_path_separator = ;
# version_path_separator = space
version_path_separator = os  # Use os.pathsep. Default configuration used for new projects.

# set to 'true' to search source files recursively
# in each "version_locations" directory
# new in Alembic version 1.10
# recursive_version_locations = false

# the output encoding used when revision files
# are written from script.py.mako
# output_encoding = utf-8

sqlalchemy.url = sqlalchemy.url = sqlite:///./test.db

[post_write_hooks]
# post_write_hooks defines scripts or Python functions that are run
# on newly generated revision scripts.  See the documentation for further
# detail and examples

# format using "black" - use the console_scripts runner, against the "black" entrypoint
# hooks = black
# black.type = console_scripts
# black.entrypoint = black
# black.options = -l 79 REVISION_SCRIPT_FILENAME

# lint with attempts to fix using "ruff" - use the exec runner, execute a binary
# hooks = ruff
# ruff.type = exec
# ruff.executable = %(here)s/.venv/bin/ruff
# ruff.options = --fix REVISION_SCRIPT_FILENAME

# Logging configuration
[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
`;
}




function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


