export function OpenTexture(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0,0);

            const imageData = ctx.getImageData(0,0, canvas.width, canvas.height);

            resolve({
                width: canvas.width,
                height: canvas.height,
                pixels: imageData.data
            });
        }

        img.onerror = reject;
        img.src = url;
    });
}
