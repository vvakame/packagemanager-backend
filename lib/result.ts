import path = require("path");

import Manager = require("./manager");
import Repo = require("./repo");
import ResolvedDependency = require("./resolvedDependency");

import utils = require("./utils");
import m = require("./model");

class Result {
	dependencies:{
		[depName: string]: ResolvedDependency;
	};

	_current:ResolvedDependency;

	constructor(public manager:Manager<{}>, public recipe:m.Recipe) {
		this.recipe = utils.deepClone(this.recipe);
		Object.keys(this.recipe.dependencies).forEach(depName => {
			var dep = this.recipe.dependencies[depName];
			dep.repo = dep.repo || this.recipe.baseRepo;
			dep.ref = dep.ref || this.recipe.baseRef;
			dep.path = dep.path || depName;
		});
		this.recipe.dependencies = this.recipe.dependencies || {};
		this.recipe.postProcessForDependency = recipe.postProcessForDependency || (() => {
			false;
		});

		this.dependencies = {};
		Object.keys(this.recipe.dependencies).forEach(depName => {
			this.pushAdditionalDependency(depName, this.recipe.dependencies[depName]);
		});
	}

	pushAdditionalDependency(depName:string, dep:m.Dependency) {
		if (this._current != null && this._current.isCyclic(depName)) {
			return;
		}

		var deps = this.dependencies;
		if (this._current) {
			deps = this._current.dependencies;
		}

		dep.repo = dep.repo || this.recipe.baseRepo;
		dep.ref = dep.ref || this.recipe.baseRef;
		dep.path = dep.path || depName;

		var depResult = new ResolvedDependency(this._current, dep);
		depResult.depName = depName;
		depResult.dependencies = {};
		deps[depName] = depResult;
	}

	toDepNameAndPath(relativePath:string):{depName:string; path: string;} {
		var depName = path.join(path.dirname(this._current.depName), relativePath);
		var depPath = path.join(path.dirname(this._current.path), relativePath);
		return {
			depName: depName,
			path: depPath
		};
	}

	resolveDependencies():Promise<Result> {
		var repoPromises:Promise<Repo>[] = [];
		var needNext = false;
		this.unresolvedDependencies.forEach(dep => {
			needNext = true;
			var repo = this.manager.pickRepo(dep);
			if (!repo) {
				repo = Repo.createRepo(this.manager.baseDir, {
					url: dep.repo,
					ref: dep.ref
				});
				this.manager.repos.push(repo);
				repoPromises.push(repo.fetchIfNotInitialized());
			}
			dep.repoInstance = repo;
		});
		if (!needNext) {
			return Promise.resolve(this);
		}
		return Promise.all(repoPromises)
			.then(()=> {
				var promises = this
					.unresolvedDependencies
					.map(dep => {
						return dep.repoInstance.open(dep.ref).then(fs=> {
							var info = fs.file(dep.path).then(fileInfo => {
								dep.fileInfo = fileInfo;
							});
							var content = fs.readFile(dep.path).then(content=> {
								dep.content = content;
								this._current = dep;
								this.recipe.postProcessForDependency(this, dep, content);
								this._current = null;
							});
							return Promise.all([info, content]);
						}).catch((error:any)=> {
							dep.error = error;
						});
					});

				return Promise.all(promises).then(()=> this.resolveDependencies());
			});
	}

	get unresolvedDependencies():ResolvedDependency[] {
		var list:ResolvedDependency[] = [];

		var loop = (deps:{[depName: string]: ResolvedDependency;} = {}) => {
			Object.keys(deps).map(depName => {
				var dep = deps[depName];
				list.push(dep);
				loop(dep.dependencies);
			});
		};
		loop(this.dependencies);

		return list.filter(dep => dep.content == null && !dep.error);
	}

	get dependenciesList():ResolvedDependency[] {
		var list:ResolvedDependency[] = [];

		var loop = (deps:{[depName: string]: ResolvedDependency;} = {}) => {
			Object.keys(deps).map(depName => {
				if (list.filter(dep => dep.depName === depName).length === 0) {
					var dep = deps[depName];
					list.push(dep);
					loop(dep.dependencies);
				}
			});
		};
		loop(this.dependencies);

		return list;
	}

	toJSON():any {
		var obj:any = {};
		var self:any = this;
		for (var key in self) {
			switch (key) {
				case "dependencies":
					obj[key] = self[key];
				default:
			}
		}
		return obj;
	}
}

export = Result;
