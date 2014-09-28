var debugFlag = false;

export function debug(...args:any[]) {
    "use strict";

    if (debugFlag) {
        console.log.apply(console, args);
    }
}

export function extend(obj:any, ...args:any[]) {
    "use strict";

    args.forEach(arg => {
        for (var key in arg) {
            obj[key] = arg[key];
        }
    });
    return obj;
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
