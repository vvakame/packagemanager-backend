/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />

import index = require("../lib/index");
index;

import repoSpec = require("./repo_spec");
repoSpec;

import packageManagerBackendSpec = require("./package_manager_backend_spec");
packageManagerBackendSpec;
