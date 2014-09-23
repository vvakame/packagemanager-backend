import fs = require("fs");
import mkdirp = require("mkdirp");

/* tslint:disable:variable-name */
var Promise:typeof Promise = require("ypromise");
/* tslint:enable:variable-name */

import Repo = require("./repo");

import utils = require("./utils");
import deepClone = utils.deepClone;

import IOptions = PackageManagerBackend.IOptions;
import IRecipe = PackageManagerBackend.IRecipe;
import IResult = PackageManagerBackend.IResult;

class PackageManagerBackend {
    constructor(public opts:IOptions) {
        if (!this.opts) {
            throw new Error("opts is required");
        } else if (!this.opts.rootDir) {
            throw new Error("rootDir is required");
        }

        if (!fs.existsSync(this.opts.rootDir)) {
            mkdirp.sync(this.opts.rootDir);
        } else if (!fs.statSync(this.opts.rootDir).isDirectory()) {
            throw new Error(this.opts.rootDir + " is not directory");
        }
    }

    fetch(url:string):Promise<Repo> {
        return new Repo(this, url).resolve();
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

        return this.processUnresolvedDependencies(recipe, repos, result);
    }

    processUnresolvedDependencies(recipe:IRecipe, repos:{[targetDir: string]: Repo; }, result:IResult) {
        var resolvePromises:Promise<Repo>[] = [];
        var needNext = false;
        Object.keys(recipe.dependencies).forEach(depName => {
            if (result.dependencies[depName]) {
                return;
            }
            needNext = true;
            var dep = recipe.dependencies[depName];
            var repo = new Repo(this, dep.repo);
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
            return Promise.all(promises).then(()=> this.processUnresolvedDependencies(recipe, repos, result));
        });
    }
}

module PackageManagerBackend {
    "use strict";

    export interface IOptions {
        rootDir: string;
    }

    export interface ISSHInfo {
        user:string;
        hostname: string;
        path: string;
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

    export interface IDependency {
        repo?: string;
        ref?: string;
        name?: string;
        path?: string;
    }
}

export = PackageManagerBackend;
