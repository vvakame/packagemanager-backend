import * as fs from "fs";
import * as path from "path";
import * as minimatch from "minimatch";
import * as mkdirp from "mkdirp";

import * as utils from "./utils";

import Repo from "./repo";
import Result from "./result";
import * as m from "./model";

export default class Manager<T> {
    static createManager<T>(options: m.ManagerOptions): Promise<Manager<T>> {
        let manager = new Manager();
        manager._check(options);
        manager._resolveBaseDir(options);
        return manager
            ._resolveRepos(options)
            .then(() => manager);
    }

    baseDir: string;
    repos: Repo[] = [];

    _check(options: m.ManagerOptions): void {
        if (!options) {
            throw new Error("options is required");
        } else if (!options.rootDir) {
            throw new Error("rootDir is required");
        } else if (!options.repos) {
            throw new Error("repos is required");
        }
    }

    _resolveBaseDir(options: m.ManagerOptions): void {
        let homeDir = utils.homeDir();
        let containsHomeDir = options.rootDir.indexOf("~/") === 0;
        if (containsHomeDir) {
            this.baseDir = path.resolve(homeDir, options.rootDir.substr(2));
        } else {
            this.baseDir = options.rootDir;
        }
        mkdirp.sync(this.baseDir);
    }

    _resolveRepos(options: m.ManagerOptions): Promise<Repo[]> {
        let promises = options.repos.map(repo => {
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

    fetchAllRepos(): Promise<Manager<T>> {
        let promises = this.repos.map(repo => repo.fetchAll());
        return Promise.all(promises).then(() => this);
    }

    search(opts: m.SearchOptions = {}): Promise<m.SearchResult[]> {
        opts = utils.deepClone(opts);
        opts.globPatterns = opts.globPatterns || [];
        if (opts.globPattern != null) {
            opts.globPatterns.unshift(opts.globPattern);
        }

        return Promise.resolve(this.repos).then(repos => {
            let resultList: m.SearchResult[] = [];
            let promises = repos.map(repo => {
                return repo.open()
                    .then(fs => fs.fileList())
                    .then(fileList => {
                        fileList.forEach(fileInfo => {
                            resultList.push({
                                repo: repo,
                                fileInfo: fileInfo,
                            });
                        });
                    });
            });
            return Promise.all(promises).then(() => resultList);
        }).then((resultList: m.SearchResult[]) => {
            if (opts.globPatterns.length === 0) {
                return resultList;
            }
            let filteredList: m.SearchResult[] = [];
            opts.globPatterns.forEach(pattern => {
                let exclusion = pattern.indexOf("!") === 0;
                let match = minimatch.filter(exclusion ? pattern.substr(1) : pattern);
                resultList.forEach((result, i, ary) => {
                    if (match(result.fileInfo.path, i, null)) {
                        let index = filteredList.indexOf(result);
                        if (!exclusion && index === -1) {
                            filteredList.push(result);
                        } else if (exclusion && index !== -1) {
                            filteredList.splice(index, 1);
                        }
                    }
                });
            });
            return filteredList;
        }).then((resultList: m.SearchResult[]) => {
            if (!opts.regexpPattern) {
                return resultList;
            }
            return resultList.filter(result => opts.regexpPattern.test(result.fileInfo.path));
        }).then((resultList: m.SearchResult[]) => {
            if (!opts.filter) {
                return resultList;
            }
            return resultList.filter(result => opts.filter(result));
        });
    }

    getByRecipe(recipe: m.Recipe): Promise<Result> {
        return new Result(this, recipe).resolveDependencies();
    }

    pickRepo(dep: m.Dependency): Repo {
        return this.repos.filter(repo => repo.spec.url === dep.repo)[0];
    }

    saveConfig(data: T) {
        if (data == null) {
            throw new Error("data is required");
        }
        let configPath = path.resolve(this.baseDir, "config.json");
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    }

    loadConfig(): T {
        let configPath = path.resolve(this.baseDir, "config.json");
        if (fs.existsSync(configPath)) {
            let dataStr = fs.readFileSync(configPath, "utf8");
            return JSON.parse(dataStr);
        } else {
            return null;
        }
    }
}
