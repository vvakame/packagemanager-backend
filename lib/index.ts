/// <reference path="../node_modules/fs-git/fs-git.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/minimatch/minimatch.d.ts" />

// if you use Node.js 0.10, you need exec `require("es6-promise").polyfill();`

export import Manager = require("./manager");
export import Repo = require("./repo");
export import Result = require("./result");
export import ResolvedDependency = require("./resolvedDependency");

/* tslint:disable:no-unused-variable */
import model = require("./model");
export import ManagerOptions = model.ManagerOptions;
export import RepositorySpec = model.RepositorySpec;
export import SSHInfo = model.SSHInfo;
export import SearchOptions = model.SearchOptions;
export import SearchResult = model.SearchResult;
export import Recipe = model.Recipe;
export import Dependency = model.Dependency;
/* tslint:enable:no-unused-variable */
