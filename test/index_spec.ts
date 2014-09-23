/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />

import assert = require("power-assert");

import path = require("path");

import _pmb = require("../lib/index");
import PackageManagerBackend = _pmb.PackageManagerBackend;

import repoSpec = require("./repo_spec");
repoSpec;

describe("package manager backend", () => {
    it("can gitFetchAll & open with ssh", ()=> {
        var pmb = new PackageManagerBackend({rootDir: "~/.pmb-test"});
        return pmb
            .fetch("git@github.com:vvakame/fs-git.git")
            .then(repo => {
                var open = repo.open("master").then(fs=> {
                    return fs.readFile("README.md", {encoding: "utf8"}).then(content=> {
                        assert(typeof content === "string");
                    });
                });
                return Promise.all([open]);
            });
    });

    it("can gitFetchAll & open with http", ()=> {
        var pmb = new PackageManagerBackend({rootDir: "~/.pmb-test"});
        return pmb
            .fetch("https://github.com/vvakame/dotfiles.git")
            .then(repo => {
                var open = repo.open("master").then(fs=> {
                    return fs.readFile(".zshrc", {encoding: "utf8"}).then(content=> {
                        assert(typeof content === "string");
                    });
                });
                return Promise.all([open]);
            });
    });

    it("by recipe", ()=> {
        var pmb = new PackageManagerBackend({rootDir: "~/.pmb-test"});
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
                    var body:string = content.toString("utf8");
                    var reference = /\/\/\/\s+<reference\s+path=["']([^"']*)["']\s*\/>/;
                    body
                        .split("\n")
                        .map(line => line.match(reference))
                        .filter(matches => !!matches)
                        .map(matches => {
                            return matches[1];
                        })
                        .forEach(ref => {
                            var depName = path.join(path.dirname(dep.name), ref);
                            console.log(depName);
                            if (!!recipe.dependencies[depName]) {
                                return;
                            }
                            recipe.dependencies[depName] = {
                                repo: dep.repo,
                                ref: dep.ref,
                                path: path.join(path.dirname(dep.path), ref),
                                name: depName
                            };
                        });
                }
            })
            .then(result => {
                // gapi/discovery-v1-nodejs.d.ts has 1 reference
                assert(Object.keys(result.dependencies).length === 3);
                assert(Object.keys(result.dependencies).every(depName => !result.dependencies[depName].error));
                console.log(JSON.stringify(result, null, 2));
            });
    });
});
