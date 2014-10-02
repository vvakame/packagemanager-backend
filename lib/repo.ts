import _url = require("url");

import fs = require("fs");
import fsgit = require("fs-git");

/* tslint:disable:variable-name */
var Promise:typeof Promise = require("ypromise");
/* tslint:enable:variable-name */

import PackageManagerBackend = require("./package_manager_backend");
import ISSHInfo = PackageManagerBackend.ISSHInfo;

import path = require("path");
import dns = require("dns");
import mkdirp = require("mkdirp");
import child_process = require("child_process");

import utils = require("./utils");
import debug = utils.debug;

class Repo {
    targetDir:string;
    networkConnectivity:boolean;
    fetchError:string;
    alreadyTryFetchAll:boolean;

    urlInfo:_url.Url;
    sshInfo:ISSHInfo;

    constructor(public opts:PackageManagerBackend.IOptions, public url:string) {
        var urlInfo = _url.parse(this.url);
        if (urlInfo.protocol) {
            this.urlInfo = urlInfo;
            this.resolveTargetDir();
            return;
        }

        var matches = this.url.match(/^([^@]+)@([^:]+):(.*)$/);
        if (matches) {
            this.sshInfo = {
                user: matches[1],
                hostname: matches[2],
                path: matches[3]
            };
            this.resolveTargetDir();
            return;
        }

        // TODO files (zip etc...), url
    }

    getHomeDir():string {
        return process.env.HOME || process.env.USERPROFILE;
    }

    resolveTargetDir() {
        var homeDir = this.getHomeDir();
        var containsHomeDir = this.opts.rootDir.indexOf("~/") === 0;
        var endWithDotGit = /\.git$/.test(this.url);
        var type = "git";
        var baseDir:string;
        var targetHost:string;
        var targetPath:string;

        if (containsHomeDir) {
            baseDir = path.resolve(homeDir, this.opts.rootDir.substr(2));
        } else {
            baseDir = this.opts.rootDir;
        }
        if (this.urlInfo) {
            // e.g. https://github.com/borisyankov/DefinitelyTyped.git
            targetHost = this.urlInfo.host;
            targetPath = this.urlInfo.path.substr(1);
        } else if (this.sshInfo) {
            // e.g. git@github.com:vvakame/fs-git.git
            targetHost = this.sshInfo.hostname;
            targetPath = this.sshInfo.path;
        }
        if (endWithDotGit) {
            targetPath = targetPath.substr(0, targetPath.length - 4);
        }
        this.targetDir = path.resolve(baseDir, type, targetHost, targetPath);
    }

    resolve():Promise<void> {
        if (!this.targetDir) {
            return Promise.reject(new Error());
        }
        if (this.opts.offlineFirst && fs.existsSync(this.targetDir)) {
            return Promise.resolve(null);
        } else {
            return this.gitFetchAll();
        }
    }

    gitFetchAll():Promise<void> {
        if (!this.targetDir) {
            throw new Error("targetDir is undefined");
        }
        return new Promise((resolve:(value?:any)=>void, reject:(error:any)=>void)=> {
            this.alreadyTryFetchAll = true;

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
                        this.fetchError = error ? stderr.toString("utf8") : null;
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

    showRef(ref:string):Promise<string> {
        var command = this.buildCommand("show-ref", "--hash", ref);

        return new Promise((resolve:(value?:any)=>void, reject:(error:any)=>void)=> {
            child_process.exec(command, (error, stdout, stderr)=> {
                if (error) {
                    reject(error);
                } else {
                    var list = stdout.toString("utf8").split("\n").filter(str => str.length !== 0);
                    resolve(list[0]);
                }
            });
        });
    }

    buildCommand(...args:string[]):string {
        return "git --git-dir=" + this.targetDir + " " + args.join(" ");
    }

    open(ref:string):Promise<fsgit.FSGit> {
        return fsgit.open(this.targetDir, ref).catch(error=> {
            if (this.alreadyTryFetchAll) {
                return Promise.reject(error);
            } else {
                return this.gitFetchAll().then(()=> {
                    return this.open(ref);
                });
            }
        });
    }
}

export = Repo;
