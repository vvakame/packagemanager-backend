export function debug(...args:any[]) {
    "use strict";

    console.log.apply(console, args);
}

export function deepClone(obj:any) {
    "use strict";

    if (obj == null) {
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map((obj:any)=> deepClone(obj));
    } else if (typeof obj === "object") {
        var cloned:any = {};
        Object.keys(obj).forEach(key=> cloned[key] = deepClone(obj[key]));
        return cloned;
    } else {
        return obj;
    }
}
