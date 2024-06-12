 const http = require('http');
                                const fs = require('fs');
                                const formidable = require('formidable');
                                const crypto = require('crypto');
                                const nodemailer = require('nodemailer');

                                const config = require('./config');

                                const selectionMappings = {
                                    'year': { '1': '1993', '2': '1994', '3': '1995', '4': '1996', '5': '1997', '6': '1998', '7': '1999', '8': '2000', '9': '2001', '10': '2002', '11': '2003', '12': '2004', '13': '2005', '14': '2006', '15': '2007', '16': '2008', '17': '2009', '18': '2010', '19': '2011', '20': '2012', '21': '2013', '22': '2014', '23': '2015', '24': '2016', '25': '2017', '26': '2018', '27': '2019', '28': '2020', '29': '2021', '30': '2022', '31': '2023' },
                                    'make': { '1': 'Audi', '2': 'BMW', '3': 'Honda' },
                                    'model': { '1': 'A3', '2': 'A4', '3': 'A5' },
                                    'trim': { '1': 'Premium', '2': 'Premium-Plus', '3': 'Prestige' }
                                };

                                function decryptData(encryptedData, secretKey, iv) {
                                    try {
                                        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), Buffer.from(iv, 'hex'));
                                        let decryptedData = decipher.update(encryptedData, 'hex', 'utf-8');
                                        decryptedData += decipher.final('utf-8');
                                        return decryptedData;
                                    } catch (error) {
                                        console.error('Error decrypting data:', error);
                                        return null;
                                    }
                                }

                                const decryptedPassword = decryptData(config.gmail.encryptedPassword, config.gmail.secretKey, config.gmail.iv);

                                if (decryptedPassword !== null) {
                                    console.log('Decrypted password:', decryptedPassword);

                                    const transporter = nodemailer.createTransport({
                                        service: 'gmail',
                                        auth: {
                                            user: config.gmail.username,
                                            pass: decryptedPassword,
                                        },
                                    });

                                    const MAX_ATTACHMENT_SIZE_LIMIT = 25 * 1024 * 1024;

                                    async function sendEmail(submittedData, files, senderEmail, res) {
                                        console.log('Sending email...');
                                        const mailOptions = {
                                            from: senderEmail,
                                            to: 'alias@gmail.com', //enter your gmail
                                            subject: 'Submitted Form Data',
                                            text: JSON.stringify(submittedData),
                                            attachments: []
                                        };

                                        const attachments = [];
                                        for (const file of Object.values(files)) {
                                            try {
                                                const content = await fs.promises.readFile(file.path);
                                                attachments.push({
                                                    filename: file.name,
                                                    content: content,
                                                    contentType: getContentType(file.type)
                                                });
                                            } catch (error) {
                                                console.error('Error reading file:', error);
                                            }
                                        }

                                        const totalAttachmentSize = attachments.reduce((total, attachment) => total + attachment.content.length, 0);

                                        if (totalAttachmentSize <= MAX_ATTACHMENT_SIZE_LIMIT) {
                                            mailOptions.attachments = attachments;
                                        } else {
                                            console.error('Attachments exceed size limit. Email will be sent without attachments.');
                                        }

                                        try {
                                            const info = await transporter.sendMail(mailOptions);
                                            console.log('Email sent:', info.response);
                                            // Send thank you page content as the response
                                            fs.readFile(__dirname + '/submitted.html', 'utf8', (err, content) => {
                                                if (err) {
                                                    console.error('Error reading thank you HTML file:', err);
                                                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                                                    res.end('Internal Server Error');
                                                } else {
                                                    res.writeHead(200, { 'Content-Type': 'text/html' });
                                                    res.end(content);
                                                }
                                            });
                                        } catch (error) {
                                            console.error('Error sending email:', error);
                                            // Send alert to user if email sending fails
                                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                                            res.end('Error sending email');
                                        }
                                    }

                                    function getContentType(fileType) {
                                        switch (fileType) {
                                            case 'image/jpeg':
                                            case 'image/jpg':
                                                return 'image/jpeg';
                                            case 'image/png':
                                                return 'image/png';
                                            case 'application/pdf':
                                                return 'application/pdf';
                                            default:
                                                return 'application/octet-stream';
                                        }
                                    }

                                    const server = http.createServer((req, res) => {
                                        console.log('Received request:', req.method, req.url);

                                        // Access control headers
                                        res.setHeader('Access-Control-Allow-Origin', '*');
                                        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); // Include GET method
                                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                                        if (req.method === 'OPTIONS') {
                                            console.log('Handling OPTIONS request');
                                            res.writeHead(200);
                                            res.end();
                                            return;
                                        }

                                        if (req.method === 'GET' && req.url === '/submitted.html') {
                                            console.log('Handling GET request for /submitted.html');
                                            // Send thank you page content as the response
                                            fs.readFile(__dirname + '/submitted.html', 'utf8', (err, content) => {
                                                if (err) {
                                                    console.error('Error reading thank you HTML file:', err);
                                                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                                                    res.end('Internal Server Error');
                                                } else {
                                                    res.writeHead(200, { 'Content-Type': 'text/html' });
                                                    res.end(content);
                                                }
                                            });
                                        } else if (req.method === 'POST') {
                                            console.log('Handling POST request');
                                            const form = new formidable.IncomingForm();

                                            form.parse(req, (err, fields, files) => {
                                                if (err) {
                                                    console.error('Error parsing form data:', err);
                                                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                                                    res.end('Internal Server Error');
                                                    return;
                                                }

                                                const senderEmail = fields.senderEmail;

                                                Object.entries(fields).forEach(([key, value]) => {
                                                    if (selectionMappings[key] && selectionMappings[key][value]) {
                                                        fields[key] = selectionMappings[key][value];
                                                    }
                                                });

                                                console.log('Submitted data:', fields);

                                                const formData = { ...fields, files };

                                                sendEmail(formData, files, senderEmail, res);
                                            });
                                        } else {
                                            console.error('Unsupported method:', req.method);
                                            res.writeHead(405, { 'Content-Type': 'text/plain' });
                                            res.end('Error: Only POST method is allowed for form submission.');
                                        }
                                    });

                                    const PORT = process.env.PORT || 3000;
                                    server.listen(PORT, () => {
                                        console.log(`Server is running on port ${PORT}`);
                                    });
} else {
 console.error('Decryption failed. Check decryption parameters and encrypted data.');
}
