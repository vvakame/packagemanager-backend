import path = require("path");

import Manager = require("./manager");
import Repo = require("./repo");

import utils = require("./utils");
import m = require("./model");

class Result {
	dependencies:{
		[depName: string]: m.DepResult;
	};

	_current:m.DepResult;

	constructor(public manager:Manager<{}>, public recipe:m.Recipe) {
		this.recipe = utils.deepClone(this.recipe);
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
		if (this.pickDependency(depName)) {
			return;
		}

		var deps = this.dependencies;
		var depth = 1;
		if (this._current) {
			deps = this._current.dependencies;
			depth = this._current.depth + 1;
		}
		dep.repo = dep.repo || this.recipe.baseRepo;
		dep.ref = dep.ref || this.recipe.baseRef;
		dep.path = dep.path || depName;

		deps[depName] = dep;
		var depResult = deps[depName];
		depResult.depName = depName;
		depResult.depth = depth;
		depResult.dependencies = {};
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

	pickDependency(depName:string):m.DepResult {
		return this.dependenciesList.filter(dep => dep.depName === depName)[0];
	}

	get unresolvedDependencies():m.DepResult[] {
		return this.dependenciesList.filter(dep => dep.content == null && !dep.error);
	}

	get dependenciesList():m.DepResult[] {
		var list:m.DepResult[] = [];

		var loop = (deps:{[depName: string]: m.DepResult;} = {}) => {
			Object.keys(deps).map(depName => {
				var dep = deps[depName];
				list.push(dep);
				loop(dep.dependencies);
			});
		};
		loop(this.dependencies);

		return list;
	}
}

export = Result;
