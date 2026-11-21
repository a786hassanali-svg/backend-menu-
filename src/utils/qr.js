import QRCode from 'qrcode';

/**
 * Generate QR code Data URL (PNG base64)
 * @param {string} url Destination URL for table menu
 */
export const generateQRCodeDataUrl = async (url) => {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 400,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR Code data URL:', error);
    throw error;
  }
};

/**
 * Generate QR code as SVG string
 * @param {string} url Destination URL
 */
export const generateQRCodeSVG = async (url) => {
  try {
    return await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR Code SVG:', error);
    throw error;
  }
};

/**
 * Generate QR code PNG buffer
 * @param {string} url Destination URL
 */
export const generateQRCodeBuffer = async (url) => {
  try {
    return await QRCode.toBuffer(url, {
      type: 'png',
      margin: 2,
      width: 600,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR Code buffer:', error);
    throw error;
  }
};

