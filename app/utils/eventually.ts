interface Pending {
    readonly ready: false;
}

interface Ready<T> {
    readonly ready: true;
    readonly result: T;
}

export type Eventually<T> = Pending | Ready<T>;

export function pending<T>(e: Eventually<T>): e is Pending {
    return !e.ready;
}

export function ready<T>(e: Eventually<T>): e is Ready<T> {
    return e.ready;
}
