"use strict";

import Manager from "../lib/manager";

import * as path from "path";
import * as fs from "fs";

import * as assert from "power-assert";

describe("Manager", () => {
    let rootDir = path.resolve(__dirname, "../test-repository");

    describe(".createManager", () => {
        it("create rootDir", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: []
                })
                .then(manager => {
                    assert(fs.statSync(rootDir).isDirectory());
                });
        });
    });

    describe("#fetchAllRepos", () => {
        it("can git fetch --all & fs-git open", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: [{
                        url: "git@github.com:vvakame/fs-git.git"
                    }]
                })
                .then(manager => {
                    return manager.fetchAllRepos();
                })
                .then(manager => {
                    let repo = manager.repos[0];
                    assert(!!repo);

                    return repo.open("master").then(fs=> {
                        return fs.readFile("README.md", { encoding: "utf8" }).then(content=> {
                            assert(typeof content === "string");
                        });
                    });
                });
        });
    });

    describe("#search", () => {
        it("can show file list with repos parameter", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: [{
                        url: "https://github.com/borisyankov/DefinitelyTyped.git"
                    }]
                })
                .then(manager => {
                    return manager
                        .search()
                        .then(resultList => {
                            assert(resultList.length !== 0);
                            // not filtered
                            let excludePatterns = [/^notExsitsPattern$/];
                            resultList.forEach(result => {
                                assert(excludePatterns.every(regexp => !regexp.test(result.fileInfo.path)));
                            });
                        });
                });
        });

        it("can show file list with globPattern parameter", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: [{
                        url: "https://github.com/borisyankov/DefinitelyTyped.git"
                    }]
                })
                .then(manager => {
                    return manager
                        .search({
                            globPattern: "**/*.d.ts"
                        })
                        .then(resultList => {
                            assert(resultList.length !== 0);

                            let includePatterns = [/\.d\.ts$/, /\.ts$/];
                            let excludePatterns = [/\.js$/, /\.tscparams$/, /\.md$/];
                            resultList.forEach(result => {
                                assert(includePatterns.some(regexp => regexp.test(result.fileInfo.path)));
                                assert(excludePatterns.every(regexp => !regexp.test(result.fileInfo.path)));
                            });
                        });
                });
        });

        it("can show file list with globPattern parameters", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: [{
                        url: "https://github.com/borisyankov/DefinitelyTyped.git"
                    }]
                })
                .then(manager => {
                    return manager
                        .search({
                            globPatterns: [
                                "**/*.ts",
                                "!**/*.d.ts"
                            ]
                        })
                        .then(resultList => {
                            assert(resultList.length !== 0);

                            let includePatterns = [/\.ts$/];
                            let excludePatterns = [/\.js$/, /\.d\.ts$/, /\.tscparams$/, /\.md$/];
                            resultList.forEach(result => {
                                assert(includePatterns.some(regexp => regexp.test(result.fileInfo.path)));
                                assert(excludePatterns.every(regexp => !regexp.test(result.fileInfo.path)));
                            });
                        });
                });
        });

        it("can show file list with regexpPattern parameters", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: [{
                        url: "https://github.com/borisyankov/DefinitelyTyped.git"
                    }]
                })
                .then(manager => {
                    return manager
                        .search({
                            regexpPattern: /atom/
                        })
                        .then(resultList => {
                            assert(resultList.length !== 0);

                            assert(resultList.some(result => result.fileInfo.path === "atom/atom.d.ts"));
                        });
                });
        });

        it("can show file list with filter", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: [{
                        url: "https://github.com/borisyankov/DefinitelyTyped.git"
                    }]
                })
                .then(manager => {
                    return manager
                        .search({
                            filter: result => result.fileInfo.path === "atom/atom.d.ts"
                        })
                        .then(resultList => {
                            assert(resultList.length === 1);
                        });
                });
        });
    });

    describe("#getByRecipe", () => {
        it("can get file contents", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: []
                })
                .then(manager => {
                    return manager.getByRecipe({
                        baseRepo: "https://github.com/borisyankov/DefinitelyTyped.git",
                        baseRef: "master",
                        path: "typings",
                        dependencies: {
                            "node/node.d.ts": {
                                ref: "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd"
                            },
                            "gapi/discovery-v1-nodejs.d.ts": {
                                repo: "https://github.com/vvakame/gapidts.git",
                                ref: "8311d2e889b5a6637ebe092012cd647c44a8f6f4",
                                path: "test/valid/discovery-v1-nodejs.d.ts"
                            }
                        }
                    });
                })
                .then(result => {
                    assert(result.recipe);
                    assert(Object.keys(result.recipe.dependencies).length === 2);

                    assert(result.recipe.dependencies["node/node.d.ts"].ref === "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd");
                    assert(result.recipe.dependencies["node/node.d.ts"].repo === "https://github.com/borisyankov/DefinitelyTyped.git");
                    assert(result.recipe.dependencies["node/node.d.ts"].path === "node/node.d.ts");

                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].ref === "8311d2e889b5a6637ebe092012cd647c44a8f6f4");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].repo === "https://github.com/vvakame/gapidts.git");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].path === "test/valid/discovery-v1-nodejs.d.ts");

                    assert(result.dependencies);
                    assert(Object.keys(result.dependencies).length === 2);
                    assert(Object.keys(result.dependencies).every(depName => !result.dependencies[depName].error));
                    Object.keys(result.dependencies).forEach(depName=> {
                        let dep = result.dependencies[depName];
                        assert(dep.repo);
                        // assert(dep.repo.networkConnectivity); // offlineFirst
                        assert(dep.repoInstance.fetchError == null);
                        assert(dep.fileInfo.ref === "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd" || dep.fileInfo.ref === "8311d2e889b5a6637ebe092012cd647c44a8f6f4");
                        assert(dep.fileInfo.type === "blob");
                        assert(typeof dep.content === "string");
                    });
                });
        });

        it("with postProcessForDependency", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: []
                })
                .then(manager => {
                    return manager.getByRecipe({
                        baseRepo: "https://github.com/borisyankov/DefinitelyTyped.git",
                        baseRef: "master",
                        path: "typings",
                        dependencies: {
                            "node/node.d.ts": {
                                ref: "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd"
                            },
                            "gapi/discovery-v1-nodejs.d.ts": {
                                repo: "https://github.com/vvakame/gapidts.git",
                                ref: "8311d2e889b5a6637ebe092012cd647c44a8f6f4",
                                path: "test/valid/discovery-v1-nodejs.d.ts"
                            }
                        },
                        postProcessForDependency: (result, depResult, content) => {
                            let reference = /\/\/\/\s+<reference\s+path=["']([^"']*)["']\s*\/>/;
                            let body: string = content.toString("utf8");
                            body
                                .split("\n")
                                .map(line => line.match(reference))
                                .filter(matches => !!matches)
                                .forEach(matches => {
                                    let relativePath = matches[1];
                                    let obj = result.toDepNameAndPath(relativePath);
                                    result.pushAdditionalDependency(obj.depName, {
                                        repo: depResult.repo,
                                        ref: depResult.ref,
                                        path: obj.path
                                    });
                                });
                        }
                    });
                })
                .then(result => {
                    // gapi/discovery-v1-nodejs.d.ts has 1 reference
                    assert(result.recipe);
                    assert(Object.keys(result.recipe.dependencies).length === 2);
                    assert(result.recipe.dependencies["node/node.d.ts"]);
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"]);

                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].ref === "8311d2e889b5a6637ebe092012cd647c44a8f6f4");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].repo === "https://github.com/vvakame/gapidts.git");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].path === "test/valid/discovery-v1-nodejs.d.ts");

                    assert(result.dependencies["node/node.d.ts"]);
                    assert(result.dependencies["gapi/discovery-v1-nodejs.d.ts"]);
                    assert(Object.keys(result.dependencies["gapi/discovery-v1-nodejs.d.ts"].dependencies).length === 1);
                    assert(result.dependencies["gapi/discovery-v1-nodejs.d.ts"].dependencies["gapi/googleapis-nodejs-common.d.ts"]);

                    assert(result.dependencies);
                    assert(Object.keys(result.dependencies).length === 2);
                    assert(Object.keys(result.dependencies).every(depName => !result.dependencies[depName].error));
                    assert(result.dependenciesList.length === 3);
                    result.dependenciesList.forEach(dep => {
                        assert(dep.repo);
                        assert(dep.repoInstance);
                        // assert(dep.repo.networkConnectivity); // offlineFirst
                        assert(dep.repoInstance.fetchError == null);
                        assert(!dep.error);
                        assert(dep.fileInfo.ref === "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd" || dep.fileInfo.ref === "8311d2e889b5a6637ebe092012cd647c44a8f6f4");
                        assert(dep.fileInfo.type === "blob");
                        assert(typeof dep.content === "string");
                    });
                });
        });

        it("with resolveMissingDependency", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: []
                })
                .then(manager => {
                    return manager.getByRecipe({
                        baseRepo: "https://github.com/borisyankov/DefinitelyTyped.git",
                        baseRef: "master",
                        path: "typings",
                        dependencies: {
                            "node/node.d.ts": {
                                ref: "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd"
                            },
                            "noooooooooot-exists/noooooooooot-exists.d.ts": {
                                ref: "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd"
                            }
                        },
                        resolveMissingDependency: (result, dep) => {
                            if (dep.depName !== "noooooooooot-exists/noooooooooot-exists.d.ts") {
                                return null;
                            }
                            return Promise.resolve({
                                ref: "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd",
                                path: "express/express.d.ts"
                            });
                        }
                    });
                })
                .then(result => {
                    assert(result.recipe);
                    assert(Object.keys(result.recipe.dependencies).length === 2);
                    assert(result.recipe.dependencies["noooooooooot-exists/noooooooooot-exists.d.ts"].path === "noooooooooot-exists/noooooooooot-exists.d.ts");
                    assert(result.dependencies["noooooooooot-exists/noooooooooot-exists.d.ts"].path === "express/express.d.ts");
                });
        });

        it("can stop inifinite loop with resolveMissingDependency", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: []
                })
                .then(manager => {
                    return manager.getByRecipe({
                        baseRepo: "https://github.com/borisyankov/DefinitelyTyped.git",
                        baseRef: "master",
                        path: "typings",
                        dependencies: {
                            "noooooooooot-exists/noooooooooot-exists.d.ts": {
                                ref: "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd"
                            }
                        },
                        resolveMissingDependency: (result, dep) => {
                            return Promise.resolve(dep);
                        }
                    });
                }).then(() => {
                    return Promise.reject("");
                }, () => {
                    return null;
                });
        });

        it("can stop when cyclic dependencies", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: []
                })
                .then(manager => {
                    return manager.getByRecipe({
                        baseRepo: "https://github.com/borisyankov/DefinitelyTyped.git",
                        baseRef: "master",
                        path: "typings",
                        dependencies: {
                            "node/node.d.ts": {
                                ref: "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd"
                            }
                        },
                        postProcessForDependency: (result, depResult, content) => {
                            result.pushAdditionalDependency("node/node.d.ts", {
                                repo: depResult.repo,
                                ref: depResult.ref,
                                path: "node/node.d.ts"
                            });
                        }
                    });
                })
                .then(result => {
                    assert(result.dependencies["node/node.d.ts"]);
                    assert(result.dependencies["node/node.d.ts"].dependencies["node/node.d.ts"]);
                    assert(result.dependenciesList.length === 1);
                });
        });
    });

    describe("#saveConfig", () => {
        let configPath = path.resolve(rootDir, "config.json");

        beforeEach(() => {
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        });

        it("can save config data", () => {
            return Manager
                .createManager({
                    rootDir: rootDir,
                    repos: []
                })
                .then(manager => {
                    assert(!fs.existsSync(configPath));
                    manager.saveConfig({ hi: "Hello!" });
                    assert(fs.existsSync(configPath));
                });
        });
    });

    describe("#loadConfig", () => {
        let configPath = path.resolve(rootDir, "config.json");

        beforeEach(() => {
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
            fs.writeFileSync(configPath, "{\"boolean\": true}");
        });

        it("can load config data", () => {
            return Manager
                .createManager<any>({
                    rootDir: rootDir,
                    repos: []
                })
                .then(manager => {
                    let data = manager.loadConfig();
                    assert(data.boolean === true);
                });
        });
    });
});
