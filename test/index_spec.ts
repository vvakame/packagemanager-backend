"use strict";

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
