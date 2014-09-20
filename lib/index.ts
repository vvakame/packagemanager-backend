/// <reference path="../node_modules/fs-git/fs-git.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

// import fsgit = require("fs-git");

/* tslint:disable:variable-name */
// var Promise:typeof Promise = require("ypromise");
/* tslint:enable:variable-name */

try {
    // optional
    require("source-map-support").install();
} catch (e) {
}

class PackageManagerBackend {
}

export = PackageManagerBackend;
