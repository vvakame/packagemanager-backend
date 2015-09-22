"use strict";

require("es6-promise").polyfill();

try {
	// optional
	require("source-map-support").install();
} catch (e) {
}

export * from "./repoSpec";
export * from "./managerSpec";
