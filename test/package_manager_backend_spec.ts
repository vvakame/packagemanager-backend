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
    });

    describe("#fetch", ()=> {
        it("can git fetch --all & fs-git open", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
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

    describe("#getByRecipe", ()=> {
        it("can get file contents", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
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
                        assert(dep.repo.networkConnectivity);
                        assert(dep.repo.fetchError == null);
                        assert(typeof dep.content === "string");
                    });
                });
        });

        it("with postProcessForDependency", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
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
                        assert(dep.repo.networkConnectivity);
                        assert(dep.repo.fetchError == null);
                        assert(typeof dep.content === "string");
                    });
                });
        });
    });
});
