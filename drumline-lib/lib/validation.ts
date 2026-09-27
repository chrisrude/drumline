export { validateProperties };

const hasOwn = (obj: object, property: string): boolean =>
    Object.prototype.hasOwnProperty.call(obj, property);

const validateProperties = (
    obj: { [s: string]: unknown },
    numProperties: string[],
    strProperties: string[]
) => {
    if (obj === null || typeof obj !== 'object') {
        throw new Error('Invalid action: not an object');
    }
    for (const [key, value] of Object.entries(obj)) {
        if (numProperties.includes(key)) {
            if (typeof value !== 'number') {
                throw new Error(`Invalid action: ${key} is not a number`);
            }
        }
        if (strProperties.includes(key)) {
            if (typeof value !== 'string') {
                throw new Error(`Invalid action: ${key} is not a string`);
            }
        }
    }
    for (const property of numProperties) {
        if (!hasOwn(obj, property)) {
            throw new Error(`Invalid action: ${property} is missing`);
        }
    }
    for (const property of strProperties) {
        if (!hasOwn(obj, property)) {
            throw new Error(`Invalid action: ${property} is missing`);
        }
    }
};
