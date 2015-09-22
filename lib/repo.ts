"use strict";

import url = require("url");
import fs = require("fs");
import path = require("path");
import dns = require("dns");
import mkdirp = require("mkdirp");
import child_process = require("child_process");

import fsgit = require("fs-git");

import m = require("./model");
import utils = require("./utils");

var debug:any = () => {
};

class Repo {
	static createRepo(baseDir:string, spec:m.RepositorySpec):Repo {
		var _repo = new Repo(spec);
		_repo._resolveTargetDir(baseDir);
		return _repo;
	}

	urlInfo:url.Url;
	sshInfo:m.SSHInfo;

	targetDir:string;
	networkConnectivity:boolean;
	fetchError:string;
	alreadyTryFetchAll:boolean;

	constructor(public spec:m.RepositorySpec) {
		this.spec = utils.deepClone(this.spec);
		this.spec.ref = this.spec.ref || "master";

		var urlInfo = url.parse(spec.url);
		if (urlInfo.protocol) {
			this.urlInfo = urlInfo;
			return;
		}

		var matches = spec.url.match(/^([^@]+)@([^:]+):(.*)$/);
		if (matches) {
			this.sshInfo = {
				user: matches[1],
				hostname: matches[2],
				path: matches[3]
			};
			return;
		}

		// TODO files (zip etc...), url
	}

	_resolveTargetDir(baseDir:string) {
		if (baseDir.indexOf("~/") === 0) {
			var homeDir = utils.homeDir();
			baseDir = path.resolve(homeDir, baseDir.substr(2));
		}

		var endWithDotGit = /\.git$/.test(this.spec.url);
		var type = "git";
		var targetHost:string;
		var targetPath:string;

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
		if (fs.existsSync(this.targetDir) && !fs.statSync(this.targetDir).isDirectory()) {
			throw new Error(this.targetDir + " is not directory");
		}
	}

	fetchIfNotInitialized():Promise<Repo> {
		if (!this.targetDir) {
			return Promise.reject<Repo>(new Error());
		}
		if (fs.existsSync(this.targetDir)) {
			return Promise.resolve(this);
		} else {
			return this.fetchAll();
		}
	}

	fetchAll():Promise<Repo> {
		return new Promise((resolve:(value:Repo)=>void, reject:(error:any)=>void)=> {
			this.alreadyTryFetchAll = true;

			// check network connectivity
			var hostname:string;
			if (this.urlInfo) {
				hostname = this.urlInfo.hostname;
			} else if (this.sshInfo) {
				hostname = this.sshInfo.hostname;
			} else {
				throw new Error("unsupported url: " + this.spec.url);
			}
			dns.resolve(hostname, err => {
				this.networkConnectivity = !err;
				if (this.networkConnectivity) {
					var command:string;
					if (fs.existsSync(this.targetDir)) {
						command = this._buildCommand("fetch", "--all");
					} else {
						debug("make dir", path.resolve(this.targetDir, "../"));
						mkdirp.sync(path.resolve(this.targetDir, "../"));
						command = this._buildCommand("clone", "--mirror", this.spec.url, this.targetDir);
					}
					debug("exec command", command);
					child_process.exec(command, (error, stdout, stderr)=> {
						this.fetchError = error ? stderr.toString("utf8") : null;
						resolve(this);
					});
				} else {
					if (!fs.existsSync(this.targetDir)) {
						reject("no network connectivity");
						return;
					} else {
						resolve(this);
						return;
					}
				}
			});
		});
	}

	_buildCommand(...args:string[]):string {
		return "git --git-dir=" + this.targetDir + " " + args.join(" ");
	}

	open(ref:string = this.spec.ref):Promise<fsgit.FSGit> {
		ref = ref || "master";
		return fsgit.open(this.targetDir, ref).catch(error=> {
			if (this.alreadyTryFetchAll) {
				return Promise.reject(error);
			} else {
				return this.fetchAll().then(()=> {
					return this.open(ref);
				});
			}
		});
	}
}

export = Repo;
