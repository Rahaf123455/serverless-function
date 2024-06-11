const crypto = require('crypto');

// Function to generate a random secret key
function generateSecretKey() {
    return crypto.randomBytes(32).toString('hex');
}

// Function to encrypt data
function encryptData(data, secretKey) {
    const iv = crypto.randomBytes(16); // Generate an initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
    let encryptedData = cipher.update(data, 'utf-8', 'hex');
    encryptedData += cipher.final('hex');
    return {
        iv: iv.toString('hex'),
        encryptedData: encryptedData
    };
}

// Generate a secret key (make sure to keep this secure)
const secretKey = generateSecretKey();

// Encrypt your Gmail password
const encryptedPassword = encryptData('wkel nmgf uetf zljm', secretKey); //enter your app generated password in gmail

// Export the configuration
module.exports = {
    gmail: {
        username: 'bcautooffer@gmail.com', //enter your gmail 
        encryptedPassword: encryptedPassword.encryptedData, // Access encrypted data property
        iv: encryptedPassword.iv, // Include initialization vector
        secretKey: secretKey
    }
};
