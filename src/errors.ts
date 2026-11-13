export type CCGenErrorCode =
    | "UNKNOWN_BRAND"
    | "BRAND_NOT_AVAILABLE"
    | "UNKNOWN_ISSUER"
    | "NO_MATCHING_BIN"
    | "INVALID_OPTION";

/**
 * Every error thrown by CCGen is a CCGenError. `code` is stable and safe to
 * branch on; `message` is for people.
 */
export class CCGenError extends Error {
    readonly code: CCGenErrorCode;

    constructor(code: CCGenErrorCode, message: string) {
        super(message);
        this.name = "CCGenError";
        this.code = code;
        // Keep `instanceof` working when compiled to older targets
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
