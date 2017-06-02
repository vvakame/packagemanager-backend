export function homeDir(): string {
    return process.env.HOME || process.env.USERPROFILE;
}

export function deepClone(obj: any): any {
    if (obj == null) {
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map((obj: any) => deepClone(obj));
    } else if (obj instanceof RegExp) {
        return obj;
    } else if (typeof obj === "object") {
        let cloned: any = {};
        Object.keys(obj).forEach(key => cloned[key] = deepClone(obj[key]));
        return cloned;
    } else {
        return obj;
    }
}
