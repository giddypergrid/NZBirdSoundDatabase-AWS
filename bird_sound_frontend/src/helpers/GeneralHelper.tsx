export const cleanupResourceMap = (map: Map<string, string>) => {
    map.forEach((url) => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    map.clear();
};
export const cleanupItemsResource = <T,>(items: T[], field: keyof T, map: Map<string, string>) => {
    items.forEach(item => {
        if (item[field] && typeof item[field] === 'string') {
            const url = map.get(String(item[field]));
            if (url && typeof url === 'string' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
            map.delete(String(item[field]));
        }
    });
};