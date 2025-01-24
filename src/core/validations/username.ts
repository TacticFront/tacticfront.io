export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;

const validPattern = /^[a-zA-Z0-9_ ]+$/;

export function validateUsername(username: string): { isValid: boolean; error?: string } {

    if (typeof username !== 'string') {
        return { isValid: false, error: "Username must be a string." };
    }

    if (username.length < MIN_USERNAME_LENGTH) {
        return {
            isValid: false,
            error: `Username must be at least ${MIN_USERNAME_LENGTH} characters long.`,
        };
    }

    if (username.length > MAX_USERNAME_LENGTH) {
        return {
            isValid: false,
            error: `Username must not exceed ${MAX_USERNAME_LENGTH} characters.`,
        };
    }

    if (!validPattern.test(username)) {
        return {
            isValid: false,
            error: "Username can only contain letters, numbers, and underscores.",
        };
    }

    // All checks passed
    return { isValid: true };
}

export function sanitizeUsername(str: string): string {
    const sanitized = str.replace(/[^a-zA-Z0-9]/g, '').slice(0, MAX_USERNAME_LENGTH);
    return sanitized.padEnd(MIN_USERNAME_LENGTH, 'x')
};