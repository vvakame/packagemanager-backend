import fsgit = require("fs-git");
import Repo = require("./repo");
import Result = require("./result");
import ResolvedDependency = require("./resolvedDependency");

import m = require("./model");

export interface ManagerOptions {
	rootDir: string;
	repos: RepositorySpec[];
}

export interface RepositorySpec {
	url: string;
	ref?: string;
}

export interface SSHInfo {
	user:string;
	hostname: string;
	path: string;
}

export interface SearchOptions {
	globPattern?:string;
	globPatterns?:string[];
	regexpPattern?:RegExp;
	filter?:(result:SearchResult)=>boolean;
}

export interface SearchResult {
	repo: Repo;
	fileInfo: fsgit.FileInfo;
}

export interface Recipe {
	baseRepo?: string;
	baseRef?: string;
	path: string;
	dependencies: {[name: string]: Dependency};
	postProcessForDependency?(result:Result, depResult:ResolvedDependency, content:any): void;
	resolveMissingDependency?(result:Result, missing:ResolvedDependency): Promise<m.Dependency>;
}

export interface Dependency {
	repo?: string;
	ref?: string;
	path?: string;
}
