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

export = Repo;
