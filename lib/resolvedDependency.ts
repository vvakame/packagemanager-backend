"use strict";

import fsgit = require("fs-git");

import m = require("./model");
import Repo = require("./repo");

class ResolvedDependency {
	repo:string;
	ref:string;
	path:string;
	depName:string;
	repoInstance:Repo;
	error:any;
	fileInfo:fsgit.FileInfo;
	content:Buffer;
	dependencies:{[name: string]: ResolvedDependency;};

	constructor(public parent:ResolvedDependency, dep:m.Dependency = {}) {
		this.repo = dep.repo;
		this.ref = dep.ref;
		this.path = dep.path;
	}

	get depth():number {
		if (!this.parent) {
			return 1;
		}
		return this.parent.depth + 1;
	}

	get cyclic():boolean {
		return this.isCyclic(this.depName);
	}

	isCyclic(depName:string):boolean {
		// NOTE not compare with this
		if (!this.parent) {
			return false;
		} else if (this.parent.depName === depName) {
			return true;
		} else {
			return this.parent.isCyclic(depName);
		}
	}

	toJSON():any {
		var obj:any = {};
		var self:any = this;
		obj["depth"] = self["depth"];
		for (var key in self) {
			switch (key) {
				case "content":
				case "parent":
				case "repoInstance":
				case "depth": // at first
				case "dependencies": // at last
					break;
				default:
					obj[key] = self[key];
			}
		}
		obj["dependencies"] = self["dependencies"];
		return obj;
	}
}

export = ResolvedDependency;
