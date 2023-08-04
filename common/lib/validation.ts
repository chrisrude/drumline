export { validateProperties };

const validateProperties = (
    obj: { [s: string]: unknown },
    numProperties: string[],
    strProperties: string[]
) => {
    if (obj === null) {
        throw new Error('Invalid action: (null)');
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
};
