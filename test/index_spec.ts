/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/power-assert/power-assert.d.ts" />

require("es6-promise").polyfill();

try {
	// optional
	require("source-map-support").install();
} catch (e) {
}

import index = require("../lib/index");
index;

import repoSpec = require("./repo_spec");
repoSpec;

import managerSpec = require("./manager_spec");
managerSpec;
