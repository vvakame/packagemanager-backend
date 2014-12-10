// Generated by dts-bundle v0.2.0
// Dependencies for this module:
//   node_modules/fs-git/fs-git.d.ts
//   typings/node/node.d.ts

declare module 'packagemanager-backend' {
    export import PackageManagerBackend = require("packagemanager-backend/lib/package_manager_backend");
    export import Repo = require("packagemanager-backend/lib/repo");
    export import utils = require("packagemanager-backend/lib/utils");
}

declare module 'packagemanager-backend/lib/package_manager_backend' {
    import fsgit = require("fs-git");
    import Repo = require("packagemanager-backend/lib/repo");
    import IOptions = PackageManagerBackend.IOptions;
    import ISearchOptions = PackageManagerBackend.ISearchOptions;
    import IRecipe = PackageManagerBackend.IRecipe;
    import IResult = PackageManagerBackend.IResult;
    import IDependency = PackageManagerBackend.IDependency;
    class PackageManagerBackend {
        opts: IOptions;
        baseDir: string;
        constructor(opts: IOptions);
        fetch(url: string, opts?: IOptions): Promise<Repo>;
        search(opts: ISearchOptions): Promise<fsgit.IFileInfo[]>;
        getByRecipe(recipe: IRecipe): Promise<IResult>;
        resolveDependencies(recipe: IRecipe, repos: {
            [x: string]: Repo;
        }, result: IResult): Promise<IResult>;
        pushAdditionalDependency(recipe: IRecipe, baseDep: IDependency, relativePath: string): void;
        saveConfig(data: any): void;
        loadConfig(): any;
    }
    module PackageManagerBackend {
        interface IOptions {
            rootDir: string;
            offlineFirst?: boolean;
            repos?: IRepository[];
        }
        interface ISSHInfo {
            user: string;
            hostname: string;
            path: string;
        }
        interface ISearchOptions {
            repos?: IRepository[];
            offlineFirst?: boolean;
            globPattern?: string;
            globPatterns?: string[];
            regexpPattern?: RegExp;
            filter?: (fileInfo: fsgit.IFileInfo) => boolean;
        }
        interface IRecipe {
            baseRepo?: string;
            baseRef?: string;
            path: string;
            dependencies: {
                [x: string]: IDependency;
            };
            postProcessForDependency?(recipe: IRecipe, dep: IDependency, content: any): void;
        }
        interface IResult {
            recipe: IRecipe;
            dependencies: {
                [x: string]: IDepResult;
            };
        }
        interface IDepResult {
            repo: Repo;
            error?: any;
            content?: Buffer;
        }
        interface IRepository {
            url: string;
            ref?: string;
        }
        interface IDependency {
            repo?: string;
            ref?: string;
            name?: string;
            path?: string;
        }
    }
    export = PackageManagerBackend;
}

declare module 'packagemanager-backend/lib/repo' {
    import _url = require("url");
    import fsgit = require("fs-git");
    import PackageManagerBackend = require("packagemanager-backend/lib/package_manager_backend");
    class Repo {
        opts: PackageManagerBackend.IOptions;
        url: string;
        targetDir: string;
        networkConnectivity: boolean;
        fetchError: string;
        alreadyTryFetchAll: boolean;
        urlInfo: _url.Url;
        sshInfo: PackageManagerBackend.ISSHInfo;
        constructor(opts: PackageManagerBackend.IOptions, url: string);
        getHomeDir(): string;
        resolveTargetDir(): void;
        resolve(): Promise<void>;
        gitFetchAll(): Promise<void>;
        buildCommand(...args: string[]): string;
        open(ref: string): Promise<fsgit.FSGit>;
    }
    export = Repo;
}

declare module 'packagemanager-backend/lib/utils' {
    export function debug(...args: any[]): void;
    export function extend(dest: any, ...sources: any[]): any;
    export function deepClone(obj: any): any;
    export function homeDir(): string;
}

