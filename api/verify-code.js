const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { phone, code } = req.body;

        if (!phone || !code) {
            return res.status(400).json({ error: 'Phone and code are required' });
        }

        // Format phone number
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = '+1' + formattedPhone;
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        // Verify the code via Twilio Verify
        const verificationCheck = await client.verify.v2
            .services(verifyServiceSid)
            .verificationChecks.create({
                to: formattedPhone,
                code: code
            });

        if (verificationCheck.status === 'approved') {
            return res.status(200).json({ 
                success: true, 
                verified: true,
                message: 'Phone number verified!'
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                verified: false,
                message: 'Invalid verification code'
            });
        }

    } catch (error) {
        console.error('Twilio error:', error);
        return res.status(500).json({ 
            error: 'Verification failed',
            details: error.message 
        });
    }
};
