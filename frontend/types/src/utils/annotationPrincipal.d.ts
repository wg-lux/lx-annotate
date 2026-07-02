export declare function getAnnotatorPrincipalFromAuthUser(user: Record<string, unknown> | null | undefined): string;
export declare function loadAnnotatorOverride(scope: string, basePrincipal: string): string | null;
export declare function saveAnnotatorOverride(scope: string, basePrincipal: string, overridePrincipal: string): void;
export declare function clearAnnotatorOverride(scope: string, basePrincipal: string): void;
