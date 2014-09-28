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
import http = require("http");
import request = require("request");
// (<any>request).debug = true;

import utils = require("./utils");
import debug = utils.debug;

class Repo {
    targetDir:string;
    networkConnectivity:boolean;
    fetchError:string;
    alreadyTryFetchAll:boolean;

    urlInfo:_url.Url;
    sshInfo:ISSHInfo;

    type:Repo.Type;

    constructor(public backend:PackageManagerBackend, public url:string) {
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

    checkUrlInfo():Promise<Repo.Type> {
        if (!this.urlInfo) {
            return Promise.reject("urlInfo is not exists");
        }

        return new Promise((resolve:(value:Repo.Type)=>void, reject:(error?:any)=>void)=> {
            var contentTypeToType = (response:http.ClientResponse) => {
                var contentType:string = response.headers["content-type"];
                switch (contentType) {
                    case 'application/zip':
                        return Repo.Type.Zip;
                    case 'application/x-gzip':
                        return Repo.Type.GZip;
                    default:
                        break;
                }
                return void 0;
            };

            var doRequest = (targetUrl:string) => {
                var req = request(targetUrl, {
                    method: "HEAD",
                    followRedirect: false,
                    followAllRedirects: false
                }, (error:any, response:http.ClientResponse, body:any)=> {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (response.statusCode === 301) {
                        // GitHub returns 301 Moved.
                        this.type = Repo.Type.Git;
                        resolve(this.type);
                    } else if (response.statusCode === 302) {
                        this.type = contentTypeToType(response);
                        if (this.type != null) {
                            resolve(this.type);
                            return;
                        }

                        var location:string = response.headers.location;
                        if (!location) {
                            reject("location header is not exists");
                            return;
                        }
                        doRequest(location);
                    } else if (response.statusCode === 200) {
                        this.type = contentTypeToType(response);
                        if (this.type != null) {
                            resolve(this.type);
                            return;
                        }

                        reject("unsupported Content-Type: " + response.headers["content-type"]);
                    } else {
                        reject("unsupported http status code: " + response.statusCode);
                    }
                });
                req.end();
            };
            doRequest(this.url);
        });
    }

    resolveTargetDir() {
        var homeDir = this.getHomeDir();
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

    resolve():Promise<void> {
        if (!this.targetDir) {
            return Promise.reject(new Error());
        }
        if (this.backend.opts.offlineFirst && fs.existsSync(this.targetDir)) {
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

module Repo {
    "use strict";

    export enum Type {
        Git,
        Zip,
        GZip
    }
}

export = Repo;
