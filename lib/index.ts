/// <reference path="../node_modules/fs-git/fs-git.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/mkdirp/mkdirp.d.ts" />

import fsgit = require("fs-git");
import fs = require("fs");

import _url = require("url");
import path = require("path");
import mkdirp = require("mkdirp");

import dns = require("dns");
import child_process = require("child_process");

/* tslint:disable:variable-name */
var Promise:typeof Promise = require("ypromise");
/* tslint:enable:variable-name */

try {
    // optional
    require("source-map-support").install();
} catch (e) {
}

function debug(...args:any[]) {
    "use strict";

    console.log.apply(console, args);
}

function deepClone(obj:any) {
    "use strict";

    if (obj == null) {
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map((obj:any)=> deepClone(obj));
    } else if (typeof obj === "object") {
        var cloned:any = {};
        Object.keys(obj).forEach(key=> cloned[key] = deepClone(obj[key]));
        return cloned;
    } else {
        return obj;
    }
}

export class PackageManagerBackend {
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

export class Repo {
    targetDir:string;
    networkConnectivity:boolean;
    fetchFailed:boolean;

    urlInfo:_url.Url;
    sshInfo:ISSHInfo;

    constructor(public backend:PackageManagerBackend, public url:string) {
        var urlInfo = _url.parse(this.url);
        if (urlInfo.protocol) {
            this.urlInfo = urlInfo;
            this.resolveTarget();
            return;
        }

        var matches = this.url.match(/^([^@]+)@([^:]+):(.*)$/);
        if (matches) {
            this.sshInfo = {
                user: matches[1],
                hostname: matches[2],
                path: matches[3]
            };
            this.resolveTarget();
            return;
        }

        // TODO files (zip etc...), url
    }

    resolveTarget() {
        var homeDir = process.env.HOME || process.env.USERPROFILE;
        var containsHomeDir = this.backend.opts.rootDir.indexOf("~/") === 0;
        if (this.urlInfo) {
            // e.g. https://github.com/borisyankov/DefinitelyTyped.git
            if (containsHomeDir) {
                this.targetDir = path.resolve(homeDir, this.backend.opts.rootDir.substr(2), this.urlInfo.host, this.urlInfo.path.substr(1));
            } else {
                this.targetDir = path.resolve(this.backend.opts.rootDir, this.urlInfo.host, this.urlInfo.path.substr(1));
            }
        } else if (this.sshInfo) {
            // e.g. git@github.com:vvakame/fs-git.git
            if (containsHomeDir) {
                this.targetDir = path.resolve(homeDir, this.backend.opts.rootDir.substr(2), this.sshInfo.hostname, this.sshInfo.path);
            } else {
                this.targetDir = path.resolve(this.backend.opts.rootDir, this.sshInfo.hostname, this.sshInfo.path);
            }
        }
    }

    resolve():Promise<Repo> {
        if (!this.targetDir) {
            return Promise.reject(new Error());
        }

        return this.gitFetchAll().then(() => this);
    }

    gitFetchAll():Promise<void> {
        if (!this.targetDir) {
            throw new Error("targetDir is undefined");
        }
        return new Promise((resolve:(value?:any)=>void, reject:(error:any)=>void)=> {
            // check network connectivity
            var hostname:string;
            if (this.urlInfo) {
                hostname = this.urlInfo.hostname;
            } else if (this.sshInfo) {
                hostname = this.sshInfo.hostname;
            } else {
                throw new Error("unsupported url: " + this.url);
            }
            dns.resolve(hostname, err => {
                this.networkConnectivity = !err;
                if (this.networkConnectivity) {
                    var command:string;
                    if (fs.existsSync(this.targetDir)) {
                        command = this.buildCommand("fetch", "--all");
                    } else {
                        debug("make dir", path.resolve(this.targetDir, "../"));
                        mkdirp.sync(path.resolve(this.targetDir, "../"));
                        command = this.buildCommand("clone", "--mirror", this.url, this.targetDir);
                    }
                    debug("exec command", command);
                    child_process.exec(command, (error, stdout, stderr)=> {
                        this.fetchFailed = !!error;
                        resolve();
                    });
                } else {
                    if (!fs.existsSync(this.targetDir)) {
                        reject("no network connectivity");
                        return;
                    } else {
                        resolve();
                        return;
                    }
                }
            });
        });
    }

    buildCommand(...args:string[]):string {
        return "git --git-dir=" + this.targetDir + " " + args.join(" ");
    }

    open(ref:string):Promise<fsgit.FSGit> {
        return fsgit.open(this.targetDir, ref);
    }
}

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