/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/power-assert/power-assert.d.ts" />

import index = require("../lib/index");
index;

import repoSpec = require("./repo_spec");
repoSpec;

import managerSpec = require("./manager_spec");
managerSpec;
