/// <reference path="../node_modules/fs-git/fs-git.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/mkdirp/mkdirp.d.ts" />

try {
    // optional
    require("source-map-support").install();
} catch (e) {
}

export import PackageManagerBackend = require("./package_manager_backend");
export import Repo = require("./repo");
export import utils = require("./utils");
