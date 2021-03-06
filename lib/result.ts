import * as path from "path";

import Manager from "./manager";
import Repo from "./repo";
import ResolvedDependency from "./resolvedDependency";

import * as utils from "./utils";
import * as m from "./model";

export default class Result {
    dependencies: {
        [depName: string]: ResolvedDependency;
    };

    _current: ResolvedDependency;

    constructor(public manager: Manager<{}>, public recipe: m.Recipe) {
        this.recipe = utils.deepClone(this.recipe);
        Object.keys(this.recipe.dependencies).forEach(depName => {
            let dep = this.recipe.dependencies[depName];
            dep.repo = dep.repo || this.recipe.baseRepo;
            dep.ref = dep.ref || this.recipe.baseRef;
            dep.path = dep.path || depName;
        });
        this.recipe.dependencies = this.recipe.dependencies || {};
        this.recipe.postProcessForDependency = recipe.postProcessForDependency || (() => {
            false;
        });
        this.recipe.resolveMissingDependency = recipe.resolveMissingDependency || ((): Promise<m.Dependency> => {
            return Promise.resolve(null);
        });

        this.dependencies = {};
        Object.keys(this.recipe.dependencies).forEach(depName => {
            this.pushAdditionalDependency(depName, this.recipe.dependencies[depName]);
        });
    }

    pushAdditionalDependency(depName: string, dep: m.Dependency, parent = this._current) {
        if (parent != null && parent.isCyclic(depName)) {
            return;
        }

        let deps = this.dependencies;
        if (parent) {
            deps = parent.dependencies;
        }

        dep.repo = dep.repo || this.recipe.baseRepo;
        dep.ref = dep.ref || this.recipe.baseRef;
        dep.path = dep.path || depName;

        let depResult = new ResolvedDependency(parent, dep);
        depResult.depName = depName;
        depResult.dependencies = {};
        deps[depName] = depResult;
    }

    toDepNameAndPath(relativePath: string): { depName: string; path: string; } {
        let depName = path.join(path.dirname(this._current.depName), relativePath);
        let depPath = path.join(path.dirname(this._current.path), relativePath);
        if (path.posix) {
            // (windows) for git cli
            // path.posix are exists after node v0.12
            depName = path.posix.join(path.dirname(this._current.depName), relativePath);
            depPath = path.posix.join(path.dirname(this._current.path), relativePath);
        }
        return {
            depName: depName,
            path: depPath,
        };
    }

    resolveDependencies(): Promise<Result> {
        let repoPromises: Promise<Repo>[] = [];
        let needNext = false;
        this.unresolvedDependencies.forEach(dep => {
            needNext = true;
            let repo = this.manager.pickRepo(dep);
            if (!repo) {
                repo = Repo.createRepo(this.manager.baseDir, {
                    url: dep.repo,
                    ref: dep.ref,
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
            .then(() => {
                let promises = this
                    .unresolvedDependencies
                    .map(dep => {
                        return dep.repoInstance.open(dep.ref).then(fs => {
                            let info = fs.file(dep.path).then(fileInfo => {
                                dep.fileInfo = fileInfo;
                            });
                            let content = fs.readFile(dep.path).then(content => {
                                dep.content = content;
                                this._current = dep;
                                this.recipe.postProcessForDependency(this, dep, content);
                                this._current = null;
                            });
                            // TODO stop use Promise.all. it can't show pretty error print.
                            return Promise.all([info, content]);
                        }).catch(error => {
                            dep.error = error;
                            return Promise.resolve(null)
                                .then(() => {
                                    this._current = dep;
                                    let newDep = this.recipe.resolveMissingDependency(this, dep);
                                    this._current = null;
                                    return Promise.resolve(newDep).then(newDep => {
                                        if (newDep) {
                                            if (newDep.repo === dep.repo && newDep.ref === dep.ref && newDep.path === dep.path) {
                                                // stop infinite loop, but can't detect cyclic pattern. e.g. a -> b -> a -> b -> ...
                                                return null;
                                            }
                                            return newDep;
                                        } else {
                                            return null;
                                        }
                                    });
                                })
                                .then(newDep => {
                                    // put back `err` when resolveMissingDependency was failed.
                                    if (!newDep) {
                                        return Promise.reject(error);
                                    }
                                    newDep.repo = newDep.repo || dep.repo;
                                    newDep.ref = newDep.ref || dep.ref;
                                    newDep.path = newDep.path || dep.path;
                                    let newDepResult = new ResolvedDependency(dep.parent, newDep);
                                    newDepResult.depName = dep.depName;
                                    newDepResult.dependencies = {};

                                    // replace!
                                    if (dep.parent) {
                                        dep.parent.dependencies[dep.depName] = newDepResult;
                                    } else {
                                        this.dependencies[dep.depName] = newDepResult;
                                    }
                                    return Promise.resolve(null);
                                });
                        });
                    });

                return Promise.all(promises).then(() => this.resolveDependencies());
            },
        );
    }

    get unresolvedDependencies(): ResolvedDependency[] {
        let list: ResolvedDependency[] = [];

        let loop = (deps: { [depName: string]: ResolvedDependency; } = {}) => {
            Object.keys(deps).map(depName => {
                let dep = deps[depName];
                list.push(dep);
                loop(dep.dependencies);
            });
        };
        loop(this.dependencies);

        return list.filter(dep => dep.content == null && !dep.error);
    }

    get dependenciesList(): ResolvedDependency[] {
        let list: ResolvedDependency[] = [];

        let loop = (deps: { [depName: string]: ResolvedDependency; } = {}) => {
            Object.keys(deps).map(depName => {
                if (list.filter(dep => dep.depName === depName).length === 0) {
                    let dep = deps[depName];
                    list.push(dep);
                    loop(dep.dependencies);
                }
            });
        };
        loop(this.dependencies);

        return list;
    }

    toJSON(): any {
        let obj: any = {};
        let self: any = this;
        for (let key in self) {
            switch (key) {
                case "dependencies":
                    obj[key] = self[key];
                default:
            }
        }
        return obj;
    }
}
