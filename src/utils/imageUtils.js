export const compressImage = (file, maxSizeKB = 10, maxWidth = 300) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if width is greater than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Initial compression
        let quality = 0.7;

        const compress = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
              }
              if (blob.size / 1024 <= maxSizeKB || q <= 0.1) {
                // Create a new file from the blob
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Reduce quality and try again
                compress(q - 0.1);
              }
            },
            'image/jpeg',
            q,
          );
        };

        compress(quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
