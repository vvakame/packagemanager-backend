import PackageManagerBackend = require("../lib/package_manager_backend");

import path = require("path");
import fs = require("fs");

import assert = require("power-assert");

describe("PackageManagerBackend", () => {
    var rootDir = path.resolve(__dirname, "../test-repository");

    describe("#constructor", ()=> {
        it("create rootDir", ()=> {
            new PackageManagerBackend({rootDir: rootDir});

            assert(fs.statSync(rootDir).isDirectory());
        });

        it("try offline first", ()=> {
            new PackageManagerBackend({
                rootDir: rootDir,
                offlineFirst: true
            });

            assert(fs.statSync(rootDir).isDirectory());
        });
    });

    describe("#fetch", ()=> {
        it("can git fetch --all & fs-git open", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            return pmb
                .fetch("git@github.com:vvakame/fs-git.git")
                .then(repo => {
                    return repo.open("master").then(fs=> {
                        return fs.readFile("README.md", {encoding: "utf8"}).then(content=> {
                            assert(typeof content === "string");
                        });
                    });
                });
        });
    });

    describe("#search", ()=> {
        it("can show file list with repos parameter", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            var opts:PackageManagerBackend.ISearchOptions = {
                repos: [{
                    url: "https://github.com/borisyankov/DefinitelyTyped.git"
                }]
            };
            return pmb.search(opts)
                .then(fileList=> {
                    assert(fileList.length !== 0);
                    // not filtered
                    var excludePatterns = [/^notExsitsPattern$/];
                    fileList.forEach(fileInfo => {
                        assert(excludePatterns.every(regexp => !regexp.test(fileInfo.path)));
                    });
                });
        });

        it("can show file list with globPattern parameter", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            var opts:PackageManagerBackend.ISearchOptions = {
                repos: [{
                    url: "https://github.com/borisyankov/DefinitelyTyped.git"
                }],
                globPattern: "**/*.d.ts"
            };
            return pmb.search(opts)
                .then(fileList=> {
                    assert(fileList.length !== 0);

                    var includePatterns = [/\.d\.ts$/, /\.ts$/];
                    var excludePatterns = [/\.js$/, /\.tscparams$/, /\.md$/];
                    fileList.forEach(fileInfo => {
                        assert(includePatterns.some(regexp => regexp.test(fileInfo.path)));
                        assert(excludePatterns.every(regexp => !regexp.test(fileInfo.path)));
                    });
                });
        });

        it("can show file list with globPattern parameters", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            var opts:PackageManagerBackend.ISearchOptions = {
                repos: [{
                    url: "https://github.com/borisyankov/DefinitelyTyped.git"
                }],
                globPatterns: [
                    "**/*.ts",
                    "!**/*.d.ts"
                ]
            };
            return pmb.search(opts)
                .then(fileList=> {
                    assert(fileList.length !== 0);

                    var includePatterns = [/\.ts$/];
                    var excludePatterns = [/\.js$/, /\.d\.ts$/, /\.tscparams$/, /\.md$/];
                    fileList.forEach(fileInfo => {
                        assert(includePatterns.some(regexp => regexp.test(fileInfo.path)));
                        assert(excludePatterns.every(regexp => !regexp.test(fileInfo.path)));
                    });
                });
        });

        it("can show file list with regexpPattern parameters", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            var opts:PackageManagerBackend.ISearchOptions = {
                repos: [{
                    url: "https://github.com/borisyankov/DefinitelyTyped.git"
                }],
                regexpPattern: /atom/
            };
            return pmb.search(opts)
                .then(fileList=> {
                    assert(fileList.length !== 0);

                    assert(fileList.some(fileInfo => fileInfo.path === "atom/atom.d.ts"));
                });
        });

        it("can show file list with filter", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            var opts:PackageManagerBackend.ISearchOptions = {
                repos: [{
                    url: "https://github.com/borisyankov/DefinitelyTyped.git"
                }],
                filter: fileInfo => {
                    return fileInfo.path === "atom/atom.d.ts";
                }
            };
            return pmb.search(opts)
                .then(fileList=> {
                    assert(fileList.length === 1);
                });
        });
    });

    describe("#getByRecipe", ()=> {
        it("can get file contents", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            return pmb
                .getByRecipe({
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
                })
                .then(result => {
                    assert(result.recipe);
                    assert(Object.keys(result.recipe.dependencies).length === 2);

                    assert(result.recipe.dependencies["node/node.d.ts"].ref === "8b077e4f05910a405387f4fcfbe84e8b8f15d6bd");
                    assert(result.recipe.dependencies["node/node.d.ts"].repo === "https://github.com/borisyankov/DefinitelyTyped.git");
                    assert(result.recipe.dependencies["node/node.d.ts"].path === "node/node.d.ts");
                    assert(result.recipe.dependencies["node/node.d.ts"].name === "node/node.d.ts");

                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].ref === "8311d2e889b5a6637ebe092012cd647c44a8f6f4");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].repo === "https://github.com/vvakame/gapidts.git");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].path === "test/valid/discovery-v1-nodejs.d.ts");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].name === "gapi/discovery-v1-nodejs.d.ts");

                    assert(result.dependencies);
                    assert(Object.keys(result.dependencies).length === 2);
                    assert(Object.keys(result.dependencies).every(depName => !result.dependencies[depName].error));
                    Object.keys(result.dependencies).forEach(depName=> {
                        var dep = result.dependencies[depName];
                        assert(dep.repo);
                        // assert(dep.repo.networkConnectivity); // offlineFirst
                        assert(dep.repo.fetchError == null);
                        assert(typeof dep.content === "string");
                    });
                });
        });

        it("with postProcessForDependency", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            return pmb
                .getByRecipe({
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
                    postProcessForDependency: (recipe, dep, content) => {
                        var reference = /\/\/\/\s+<reference\s+path=["']([^"']*)["']\s*\/>/;
                        var body:string = content.toString("utf8");
                        body
                            .split("\n")
                            .map(line => line.match(reference))
                            .filter(matches => !!matches)
                            .forEach(matches => {
                                pmb.pushAdditionalDependency(recipe, dep, matches[1]);
                            });
                    }
                })
                .then(result => {
                    // gapi/discovery-v1-nodejs.d.ts has 1 reference
                    assert(result.recipe);
                    assert(Object.keys(result.recipe.dependencies).length === 3);

                    assert(result.recipe.dependencies["node/node.d.ts"]);
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"]);
                    assert(result.recipe.dependencies["gapi/googleapis-nodejs-common.d.ts"]);

                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].ref === "8311d2e889b5a6637ebe092012cd647c44a8f6f4");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].repo === "https://github.com/vvakame/gapidts.git");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].path === "test/valid/discovery-v1-nodejs.d.ts");
                    assert(result.recipe.dependencies["gapi/discovery-v1-nodejs.d.ts"].name === "gapi/discovery-v1-nodejs.d.ts");

                    // copy from gapi/discovery-v1-nodejs.d.ts
                    assert(result.recipe.dependencies["gapi/googleapis-nodejs-common.d.ts"].ref === "8311d2e889b5a6637ebe092012cd647c44a8f6f4");
                    assert(result.recipe.dependencies["gapi/googleapis-nodejs-common.d.ts"].repo === "https://github.com/vvakame/gapidts.git");
                    assert(result.recipe.dependencies["gapi/googleapis-nodejs-common.d.ts"].path === "test/valid/googleapis-nodejs-common.d.ts");
                    assert(result.recipe.dependencies["gapi/googleapis-nodejs-common.d.ts"].name === "gapi/googleapis-nodejs-common.d.ts");

                    assert(result.dependencies);
                    assert(Object.keys(result.dependencies).length === 3);
                    assert(Object.keys(result.dependencies).every(depName => !result.dependencies[depName].error));
                    Object.keys(result.dependencies).forEach(depName=> {
                        var dep = result.dependencies[depName];
                        assert(dep.repo);
                        // assert(dep.repo.networkConnectivity); // offlineFirst
                        assert(dep.repo.fetchError == null);
                        assert(typeof dep.content === "string");
                    });
                });
        });
    });

    describe("#saveConfig", ()=> {
        var configPath = path.resolve(rootDir, "config.json");

        beforeEach(()=> {
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        });

        it("can save config data", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            assert(!fs.existsSync(configPath));
            pmb.saveConfig({hi: "Hello!"});
            assert(fs.existsSync(configPath));
        });
    });

    describe("#loadConfig", ()=> {
        var configPath = path.resolve(rootDir, "config.json");

        beforeEach(()=> {
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
            fs.writeFileSync(configPath, "{\"boolean\": true}");
        });

        it("can load config data", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir, offlineFirst: true});
            var data = pmb.loadConfig();
            assert(data.boolean === true);
        });
    });
});
