export const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const compressImageToBase64 = (file, maxSize = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            convertFileToBase64(file).then(resolve).catch(() => resolve(null));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    } else {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => {
                convertFileToBase64(file).then(resolve).catch(() => resolve(null));
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            convertFileToBase64(file).then(resolve).catch(() => resolve(null));
        };
        reader.readAsDataURL(file);
    });
};

export const compressBase64Image = (base64Str, maxSize = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
        if (typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
            resolve(base64Str);
            return;
        }

        const approxSize = base64Str.length * 0.75;
        if (approxSize < 150 * 1024) {
            resolve(base64Str);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                } else {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => {
            resolve(base64Str);
        };
        img.src = base64Str;
    });
};


