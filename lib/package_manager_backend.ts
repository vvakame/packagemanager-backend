import path = require("path");
import fs = require("fs");
import fsgit = require("fs-git");
import minimatch = require("minimatch");

/* tslint:disable:variable-name */
var Promise:typeof Promise = require("ypromise");
/* tslint:enable:variable-name */

import Repo = require("./repo");

import utils = require("./utils");
import deepClone = utils.deepClone;

import IOptions = PackageManagerBackend.IOptions;
import ISearchOptions = PackageManagerBackend.ISearchOptions;
import IRecipe = PackageManagerBackend.IRecipe;
import IResult = PackageManagerBackend.IResult;
import IDependency = PackageManagerBackend.IDependency;

class PackageManagerBackend {
    baseDir:string;

    constructor(public opts:IOptions) {
        if (!this.opts) {
            throw new Error("opts is required");
        } else if (!this.opts.rootDir) {
            throw new Error("rootDir is required");
        }

        var homeDir = utils.homeDir();
        var containsHomeDir = this.opts.rootDir.indexOf("~/") === 0;
        if (containsHomeDir) {
            this.baseDir = path.resolve(homeDir, this.opts.rootDir.substr(2));
        } else {
            this.baseDir = this.opts.rootDir;
        }
    }

    fetch(url:string, opts = this.opts):Promise<Repo> {
        var repo = new Repo(opts, url);
        return repo.resolve().then(()=> repo);
    }

    search(opts:ISearchOptions):Promise<fsgit.IFileInfo[]> {
        opts = utils.deepClone(opts);
        opts.repos = opts.repos || utils.deepClone(this.opts.repos) || [];
        if (opts.repos.length === 0) {
            return Promise.reject(new Error("repos are required"));
        }
        opts.repos.forEach(repo => {
            repo.ref = repo.ref || "master";
        });
        opts.globPatterns = opts.globPatterns || [];
        if (opts.globPattern != null) {
            opts.globPatterns.unshift(opts.globPattern);
        }
        opts.offlineFirst = opts.offlineFirst != null ? opts.offlineFirst : this.opts.offlineFirst;

        var resultList:fsgit.IFileInfo[] = [];
        return Promise.all(opts.repos.map(repoInfo=> {
            return this.fetch(repoInfo.url, utils.extend({}, this.opts, {offlineFirst: opts.offlineFirst}))
                .then(repo=> repo.open(repoInfo.ref))
                .then(fs=> fs.filelist())
                .then(filelist=> {
                    filelist.forEach(fileInfo => resultList.push(fileInfo));
                });
        })).then(()=> {
            if (opts.globPatterns.length === 0) {
                return resultList;
            }
            var filteredList:fsgit.IFileInfo[] = [];
            opts.globPatterns.forEach(pattern=> {
                var exclusion = pattern.indexOf("!") === 0;
                var match = minimatch.filter(exclusion ? pattern.substr(1) : pattern);
                resultList.forEach(fileInfo => {
                    if (match(fileInfo.path)) {
                        var index = filteredList.indexOf(fileInfo);
                        if (!exclusion && index === -1) {
                            filteredList.push(fileInfo);
                        } else if (exclusion && index !== -1) {
                            filteredList.splice(index, 1);
                        }
                    }
                });
            });
            return filteredList;
        }).then((resultList:fsgit.IFileInfo[])=> {
            if (!opts.regexpPattern) {
                return resultList;
            }
            return resultList.filter(fileInfo => opts.regexpPattern.test(fileInfo.path));
        }).then((resultList:fsgit.IFileInfo[])=> {
            if (!opts.filter) {
                return resultList;
            }
            return resultList.filter(fileInfo => opts.filter(fileInfo));
        });
    }

    getByRecipe(recipe:IRecipe):Promise<IResult> {
        recipe = deepClone(recipe);

        recipe.dependencies = recipe.dependencies || {};
        Object.keys(recipe.dependencies).forEach(depName => {
            var dep = recipe.dependencies[depName];
            dep.repo = dep.repo || recipe.baseRepo;
            dep.ref = dep.ref || recipe.baseRef;
            dep.path = dep.path || depName;
            dep.name = dep.name || depName;
        });
        recipe.postProcessForDependency = recipe.postProcessForDependency || (() => {
            false;
        });

        var repos:{[targetDir: string]: Repo; } = {};
        var result:IResult = {
            recipe: recipe,
            dependencies: {}
        };

        return this.resolveDependencies(recipe, repos, result);
    }

    resolveDependencies(recipe:IRecipe, repos:{[targetDir: string]: Repo; }, result:IResult) {
        var resolvePromises:Promise<void>[] = [];
        var needNext = false;
        Object.keys(recipe.dependencies).forEach(depName => {
            if (result.dependencies[depName]) {
                return;
            }
            needNext = true;
            var dep = recipe.dependencies[depName];
            var repo = new Repo(this.opts, dep.repo);
            if (!repos[repo.targetDir]) {
                repos[repo.targetDir] = repo;
                resolvePromises.push(repo.resolve());
            }
            result.dependencies[depName] = {
                repo: repos[repo.targetDir]
            };
        });
        if (!needNext) {
            return Promise.resolve(result);
        }
        return Promise.all(resolvePromises).then(()=> {
            var promises = Object.keys(recipe.dependencies).map(depName => {
                var dep = recipe.dependencies[depName];
                var depResult = result.dependencies[depName];
                if (depResult.content) {
                    return Promise.resolve(null);
                }
                return depResult.repo.open(dep.ref).then(fs=> {
                    return fs.readFile(dep.path).then(content=> {
                        depResult.content = content;
                        recipe.postProcessForDependency(recipe, dep, content);
                    });
                }).catch((error:any)=> {
                    depResult.error = error;
                });
            });
            return Promise.all(promises).then(()=> this.resolveDependencies(recipe, repos, result));
        });
    }

    pushAdditionalDependency(recipe:IRecipe, baseDep:IDependency, relativePath:string) {
        var depName = path.join(path.dirname(baseDep.name), relativePath);
        if (!!recipe.dependencies[depName]) {
            return;
        }
        recipe.dependencies[depName] = {
            repo: baseDep.repo,
            ref: baseDep.ref,
            path: path.join(path.dirname(baseDep.path), relativePath),
            name: depName
        };
    }

    saveConfig(data:any) {
        data = data || {};
        var configPath = path.resolve(this.opts.rootDir, "config.json");
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    }

    loadConfig():any {
        var configPath = path.resolve(this.opts.rootDir, "config.json");
        var dataStr = "{}";
        if (fs.existsSync(configPath)) {
            dataStr = fs.readFileSync(configPath, "utf8");
        }
        return JSON.parse(dataStr);
    }
}

module PackageManagerBackend {
    "use strict";

    export interface IOptions {
        rootDir: string;
        offlineFirst?: boolean;
        repos?:IRepository[];
    }

    export interface ISSHInfo {
        user:string;
        hostname: string;
        path: string;
    }

    export interface ISearchOptions {
        repos?:IRepository[];
        offlineFirst?: boolean;
        globPattern?:string;
        globPatterns?:string[];
        regexpPattern?:RegExp;
        filter?:(fileInfo:fsgit.IFileInfo)=>boolean;
    }

    export interface IRecipe {
        baseRepo?: string;
        baseRef?: string;
        path: string;
        dependencies: {[name: string]: IDependency};
        postProcessForDependency?(recipe:IRecipe, dep:IDependency, content:any): void;
    }

    export interface IResult {
        recipe: IRecipe;
        dependencies: {
            [depName: string]: IDepResult;
        };
    }

    export interface IDepResult {
        repo: Repo;
        error?: any;
        content?: Buffer;
    }

    export interface IRepository {
        url: string;
        ref?: string;
    }

    export interface IDependency {
        repo?: string;
        ref?: string;
        name?: string;
        path?: string;
    }
}

export = PackageManagerBackend;
