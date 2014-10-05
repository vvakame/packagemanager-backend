// /// <reference path="./node_modules/fs-git/fs-git.d.ts" />

// /// <reference path="./typings/node/node.d.ts" />
// /// <reference path="./typings/es6-promise/es6-promise.d.ts" />

declare module "packagemanager-backend" {
    import fsgit = require("fs-git");
    import _url = require("url");

    export class PackageManagerBackend {
        public opts:PackageManagerBackend.IOptions;

        constructor(opts:PackageManagerBackend.IOptions);

        public fetch(url:string, opts?:PackageManagerBackend.IOptions):Promise<Repo>;

        public search(opts:PackageManagerBackend.ISearchOptions):Promise<fsgit.IFileInfo[]>;

        public getByRecipe(recipe:PackageManagerBackend.IRecipe):Promise<PackageManagerBackend.IResult>;

        public resolveDependencies(recipe:PackageManagerBackend.IRecipe, repos:{
            [targetDir: string]: Repo;
        }, result:PackageManagerBackend.IResult):any;

        public pushAdditionalDependency(recipe:PackageManagerBackend.IRecipe, baseDep:PackageManagerBackend.IDependency, relativePath:string):void;

        public saveConfig(data: any): void;

        public loadConfig(): any;
    }

    export module PackageManagerBackend {
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
            filter?: (fileInfo:fsgit.IFileInfo) => boolean;
        }
        interface IRecipe {
            baseRepo?: string;
            baseRef?: string;
            path: string;
            dependencies: {
                [name: string]: IDependency;
            };
            postProcessForDependency? (recipe:IRecipe, dep:IDependency, content:any): void;
        }
        interface IResult {
            recipe: IRecipe;
            dependencies: {
                [depName: string]: IDepResult;
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

    export class Repo {
        public opts:PackageManagerBackend.IOptions;
        public url:string;
        public targetDir:string;
        public networkConnectivity:boolean;
        public fetchError:string;
        public alreadyTryFetchAll:boolean;
        public urlInfo:_url.Url;
        public sshInfo:PackageManagerBackend.ISSHInfo;

        constructor(opts:PackageManagerBackend.IOptions, url:string);

        public getHomeDir():string;

        public resolveTargetDir():void;

        public resolve():Promise<void>;

        public gitFetchAll():Promise<void>;

        public buildCommand(...args:string[]):string;

        public open(ref:string):Promise<fsgit.FSGit>;
    }

    export module utils {
        function debug(...args:any[]):void;

        function extend(dest:any, ...sources:any[]):any;

        function deepClone(obj:any):any;
    }
}
