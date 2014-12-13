// Generated by dts-bundle v0.2.0
// Dependencies for this module:
//   typings/node/node.d.ts
//   node_modules/fs-git/fs-git.d.ts

declare module 'packagemanager-backend' {
    export import Manager = require("packagemanager-backend/lib/manager");
    export import Repo = require("packagemanager-backend/lib/repo");
    import model = require("packagemanager-backend/lib/model");
    export import ManagerOptions = model.ManagerOptions;
    export import RepositorySpec = model.RepositorySpec;
    export import SSHInfo = model.SSHInfo;
    export import SearchOptions = model.SearchOptions;
    export import SearchResult = model.SearchResult;
    export import Recipe = model.Recipe;
    export import Result = model.Result;
    export import DepResult = model.DepResult;
    export import Dependency = model.Dependency;
}

declare module 'packagemanager-backend/lib/manager' {
    import Repo = require("packagemanager-backend/lib/repo");
    import m = require("packagemanager-backend/lib/model");
    class Manager<T> {
        static createManager<T>(options: m.ManagerOptions): Promise<Manager<T>>;
        baseDir: string;
        repos: Repo[];
        _check(options: m.ManagerOptions): void;
        _resolveBaseDir(options: m.ManagerOptions): void;
        _resolveRepos(options: m.ManagerOptions): Promise<Repo[]>;
        fetchAllRepos(): Promise<Manager<T>>;
        search(opts?: m.SearchOptions): Promise<m.SearchResult[]>;
        getByRecipe(recipe: m.Recipe): Promise<m.Result>;
        resolveDependencies(recipe: m.Recipe, result: m.Result): Promise<m.Result>;
        pushAdditionalDependency(recipe: m.Recipe, baseDep: m.Dependency, relativePath: string): void;
        pickRepo(repo: Repo): Repo;
        pickRepo(dep: m.Dependency): Repo;
        saveConfig(data: T): void;
        loadConfig(): T;
    }
    export = Manager;
}

declare module 'packagemanager-backend/lib/repo' {
    import url = require("url");
    import fsgit = require("fs-git");
    import m = require("packagemanager-backend/lib/model");
    class Repo {
        spec: m.RepositorySpec;
        static createRepo(baseDir: string, spec: m.RepositorySpec): Repo;
        urlInfo: url.Url;
        sshInfo: m.SSHInfo;
        targetDir: string;
        networkConnectivity: boolean;
        fetchError: string;
        alreadyTryFetchAll: boolean;
        constructor(spec: m.RepositorySpec);
        _resolveTargetDir(baseDir: string): void;
        fetchIfNotInitialized(): Promise<Repo>;
        fetchAll(): Promise<Repo>;
        _buildCommand(...args: string[]): string;
        open(ref?: string): Promise<fsgit.FSGit>;
    }
    export = Repo;
}

declare module 'packagemanager-backend/lib/model' {
    import fsgit = require("fs-git");
    import Repo = require("packagemanager-backend/lib/repo");
    export interface ManagerOptions {
        rootDir: string;
        repos: RepositorySpec[];
    }
    export interface RepositorySpec {
        url: string;
        ref?: string;
    }
    export interface SSHInfo {
        user: string;
        hostname: string;
        path: string;
    }
    export interface SearchOptions {
        globPattern?: string;
        globPatterns?: string[];
        regexpPattern?: RegExp;
        filter?: (result: SearchResult) => boolean;
    }
    export interface SearchResult {
        repo: Repo;
        fileInfo: fsgit.IFileInfo;
    }
    export interface Recipe {
        baseRepo?: string;
        baseRef?: string;
        path: string;
        dependencies: {
            [x: string]: Dependency;
        };
        postProcessForDependency?(recipe: Recipe, dep: Dependency, content: any): void;
    }
    export interface Result {
        recipe: Recipe;
        dependencies: {
            [x: string]: DepResult;
        };
    }
    export interface DepResult {
        repo: Repo;
        error?: any;
        content?: Buffer;
    }
    export interface Dependency {
        repo?: string;
        ref?: string;
        name?: string;
        path?: string;
    }
}

