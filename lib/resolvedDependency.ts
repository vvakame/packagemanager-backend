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
