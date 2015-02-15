import fs = require("fs");
import path = require("path");
import minimatch = require("minimatch");
import mkdirp = require("mkdirp");

import utils = require("./utils");

import Repo = require("./repo");
import Result = require("./result");
import m = require("./model");

class Manager<T> {
	static createManager<T>(options:m.ManagerOptions):Promise<Manager<T>> {
		var manager = new Manager();
		manager._check(options);
		manager._resolveBaseDir(options);
		return manager
			._resolveRepos(options)
			.then(()=> manager);
	}

	baseDir:string;
	repos:Repo[] = [];

	_check(options:m.ManagerOptions):void {
		if (!options) {
			throw new Error("options is required");
		} else if (!options.rootDir) {
			throw new Error("rootDir is required");
		} else if (!options.repos) {
			throw new Error("repos is required");
		}
	}

	_resolveBaseDir(options:m.ManagerOptions):void {
		var homeDir = utils.homeDir();
		var containsHomeDir = options.rootDir.indexOf("~/") === 0;
		if (containsHomeDir) {
			this.baseDir = path.resolve(homeDir, options.rootDir.substr(2));
		} else {
			this.baseDir = options.rootDir;
		}
		mkdirp.sync(this.baseDir);
	}

	_resolveRepos(options:m.ManagerOptions):Promise<Repo[]> {
		var promises = options.repos.map(repo => {
			// TODO remove duplicated repo
			return Repo
				.createRepo(this.baseDir, repo)
				.fetchIfNotInitialized();
		});
		return Promise.all(promises).then(repos => {
			this.repos = repos;
			return repos;
		});
	}

	fetchAllRepos():Promise<Manager<T>> {
		var promises = this.repos.map(repo => repo.fetchAll());
		return Promise.all(promises).then(()=> this);
	}

	search(opts:m.SearchOptions = {}):Promise<m.SearchResult[]> {
		opts = utils.deepClone(opts);
		opts.globPatterns = opts.globPatterns || [];
		if (opts.globPattern != null) {
			opts.globPatterns.unshift(opts.globPattern);
		}

		return Promise.resolve(this.repos).then(repos=> {
			var resultList:m.SearchResult[] = [];
			var promises = repos.map(repo=> {
				return repo.open()
					.then(fs=> fs.fileList())
					.then(fileList => {
						fileList.forEach(fileInfo => {
							resultList.push({
								repo: repo,
								fileInfo: fileInfo
							});
						});
					});
			});
			return Promise.all(promises).then(()=> resultList);
		}).then((resultList:m.SearchResult[])=> {
			if (opts.globPatterns.length === 0) {
				return resultList;
			}
			var filteredList:m.SearchResult[] = [];
			opts.globPatterns.forEach(pattern=> {
				var exclusion = pattern.indexOf("!") === 0;
				var match = minimatch.filter(exclusion ? pattern.substr(1) : pattern);
				resultList.forEach(result => {
					if (match(result.fileInfo.path)) {
						var index = filteredList.indexOf(result);
						if (!exclusion && index === -1) {
							filteredList.push(result);
						} else if (exclusion && index !== -1) {
							filteredList.splice(index, 1);
						}
					}
				});
			});
			return filteredList;
		}).then((resultList:m.SearchResult[])=> {
			if (!opts.regexpPattern) {
				return resultList;
			}
			return resultList.filter(result => opts.regexpPattern.test(result.fileInfo.path));
		}).then((resultList:m.SearchResult[])=> {
			if (!opts.filter) {
				return resultList;
			}
			return resultList.filter(result => opts.filter(result));
		});
	}

	getByRecipe(recipe:m.Recipe):Promise<Result> {
		recipe = utils.deepClone(recipe);
		recipe.dependencies = recipe.dependencies || {};
		Object.keys(recipe.dependencies).forEach(depName => {
			var dep = recipe.dependencies[depName];
			dep.repo = dep.repo || recipe.baseRepo;
			dep.ref = dep.ref || recipe.baseRef;
			dep.path = dep.path || depName;
		});
		recipe.postProcessForDependency = recipe.postProcessForDependency || (() => {
			false;
		});

		return new Result(this, recipe).resolveDependencies();
	}

	pickRepo(repo:Repo):Repo;
	pickRepo(dep:m.Dependency):Repo;
	pickRepo(v:any):Repo {
		if (v instanceof Repo) {
			var repo:Repo = v;
			return this.repos.filter(r => r.spec.url === repo.spec.url)[0];
		} else if (v) {
			var dep:m.Dependency = v;
			return this.repos.filter(repo => repo.spec.url === dep.repo)[0];
		}
	}

	saveConfig(data:T) {
		if (data == null) {
			throw new Error("data is required");
		}
		var configPath = path.resolve(this.baseDir, "config.json");
		fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
	}

	loadConfig():T {
		var configPath = path.resolve(this.baseDir, "config.json");
		if (fs.existsSync(configPath)) {
			var dataStr = fs.readFileSync(configPath, "utf8");
			return JSON.parse(dataStr);
		} else {
			return null;
		}
	}
}

export = Manager;
