/// <reference path="../node_modules/fs-git/fs-git.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/minimatch/minimatch.d.ts" />

try {
	// optional
	require("source-map-support").install();
} catch (e) {
}
require("es6-promise").polyfill();

export import Manager = require("./manager");
export import Repo = require("./repo");

/* tslint:disable:no-unused-variable */
import model = require("./model");
export import ManagerOptions = model.ManagerOptions;
export import RepositorySpec = model.RepositorySpec;
export import SSHInfo = model.SSHInfo;
export import SearchOptions = model.SearchOptions;
export import SearchResult = model.SearchResult;
export import Recipe = model.Recipe;
export import Result = model.Result;
export import DepResult = model.DepResult;
export import Dependency = model.Dependency;
/* tslint:enable:no-unused-variable */
