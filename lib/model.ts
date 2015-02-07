import fsgit = require("fs-git");
import Repo = require("./repo");

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
	postProcessForDependency?(recipe:Recipe, dep:Dependency, content:any): void;
}

export interface Result {
	recipe: Recipe;
	dependencies: {
		[depName: string]: DepResult;
	};
}

export interface DepResult {
	repo: Repo;
	error?: any;
	fileInfo?: fsgit.FileInfo;
	content?: Buffer;
}

export interface Dependency {
	repo?: string;
	ref?: string;
	name?: string;
	path?: string;
}
